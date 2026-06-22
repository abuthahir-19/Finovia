package com.expensetracker.finance.service.imports;

import com.expensetracker.finance.domain.TransactionType;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts text from a PDF statement with Apache PDFBox and parses transactions.
 *
 * <p>Supports two layouts:
 * <ul>
 *   <li><b>Multi-line blocks</b> (e.g. Google Pay): the date, "Paid to / Received from" party,
 *       and amount each sit on their own line. A standalone date line opens a block; the first
 *       direction line sets the description + direction; the first ₹ amount completes it.</li>
 *   <li><b>Single-line</b>: date, description and amount on one line (older/bank style).</li>
 * </ul>
 * Lenient by design — new layouts can be supported by extending the patterns.
 */
@Component
public class StatementPdfParser {

    /** Amount: optional currency symbol, then a grouped/plain number with optional 2dp. */
    private static final Pattern AMOUNT = Pattern.compile(
            "(₹|Rs\\.?|INR|\\$)?\\s*((?:\\d{1,3}(?:,\\d{2,3})+|\\d+)(?:\\.\\d{1,2})?)",
            Pattern.CASE_INSENSITIVE);

    /** A line that is *only* a date (begins a multi-line transaction block). */
    private static final Pattern DATE_LINE =
            Pattern.compile("^\\d{1,2}\\s+[A-Za-z]{3,9},?\\s+\\d{4}$");

    /** "Paid to <party>" / "Received from <party>" — note: NOT "Paid by <bank>". */
    private static final Pattern DIRECTION =
            Pattern.compile("(?i)^(paid to|received from)\\s+(.+)$");

    private static final List<DateFormat> DATE_FORMATS = List.of(
            new DateFormat("\\b(\\d{1,2}\\s+[A-Za-z]{3,9},?\\s+\\d{4})\\b", "d MMM yyyy"),
            new DateFormat("\\b(\\d{1,2}-[A-Za-z]{3,9}-\\d{4})\\b", "d-MMM-yyyy"),
            new DateFormat("\\b([A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{4})\\b", "MMM d yyyy"),
            new DateFormat("\\b(\\d{4}-\\d{2}-\\d{2})\\b", "yyyy-MM-dd"),
            new DateFormat("\\b(\\d{1,2}/\\d{1,2}/\\d{4})\\b", "d/M/yyyy"),
            new DateFormat("\\b(\\d{1,2}-\\d{1,2}-\\d{4})\\b", "d-M-yyyy"),
            new DateFormat("\\b(\\d{1,2}/\\d{1,2}/\\d{2})\\b", "d/M/yy"));

    private static final List<String> INCOME_KEYWORDS = List.of(
            "received", "credited", "credit", "refund", "cashback", "deposit",
            "salary", "reversal", " from ", "(cr)", " cr ");
    private static final List<String> EXPENSE_KEYWORDS = List.of(
            "paid", "debited", "debit", "sent", "withdrawn", "purchase",
            "spent", " to ", "(dr)", " dr ");

    private static final Pattern HEADER = Pattern.compile(
            "(?i)\\b(date & time|transaction details|particulars|narration|opening balance|closing balance)\\b");

    public ParseOutcome parse(byte[] pdfBytes, String password) throws IOException {
        boolean encrypted = StringUtils.hasText(password);
        try (PDDocument document = encrypted
                ? Loader.loadPDF(pdfBytes, password)
                : Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return parseText(stripper.getText(document));
        } catch (InvalidPasswordException e) {
            throw new IllegalArgumentException(
                    "This PDF is password protected. Re-upload and provide the correct password.");
        }
    }

    ParseOutcome parseText(String text) {
        List<ParsedTransaction> txns = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int skipped = 0;
        Block block = null;

        for (String raw : text.split("\\r?\\n")) {
            String line = raw.trim();
            if (line.isEmpty() || HEADER.matcher(line).find()) {
                continue;
            }

            AmountMatch amount = findAmount(line);
            LocalDate inlineDate = findDate(line);

            // 1) Single-line transaction: date AND amount on the same line.
            if (inlineDate != null && amount != null && !isDateLine(line)) {
                skipped += finalizeBlock(block, txns);
                block = null;
                txns.add(new ParsedTransaction(inlineDate, detectType(line),
                        amount.value(), amount.currency(), buildDescription(line)));
                continue;
            }

            // 2) Standalone date line: start a new multi-line block.
            if (isDateLine(line)) {
                skipped += finalizeBlock(block, txns);
                block = new Block(findDate(line));
                continue;
            }

            // 3) Lines inside a block: capture party then amount. Outside a block, ignore.
            if (block == null) {
                continue;
            }
            if (block.description == null) {
                Matcher m = DIRECTION.matcher(line);
                if (m.matches()) {
                    block.type = m.group(1).toLowerCase(Locale.ROOT).startsWith("received")
                            ? TransactionType.INCOME : TransactionType.EXPENSE;
                    block.description = trimName(m.group(2));
                    continue;
                }
            }
            if (block.amount == null && amount != null) {
                block.amount = amount.value();
                block.currency = amount.currency();
            }
        }
        skipped += finalizeBlock(block, txns);

        if (txns.isEmpty()) {
            warnings.add("No transactions could be detected. This statement layout may not be "
                    + "supported yet — try a CSV export if available.");
        } else if (skipped > 0) {
            warnings.add(skipped + " row(s) looked like transactions but were skipped "
                    + "(no amount found).");
        }
        return new ParseOutcome(txns, skipped, warnings);
    }

    /** Emits a completed block as a transaction; returns 1 if it had a date but no amount. */
    private int finalizeBlock(Block b, List<ParsedTransaction> txns) {
        if (b == null || b.date == null) {
            return 0;
        }
        if (b.amount == null) {
            return 1;
        }
        txns.add(new ParsedTransaction(
                b.date,
                b.type == null ? TransactionType.EXPENSE : b.type,
                b.amount,
                b.currency,
                b.description == null || b.description.isBlank() ? "Imported transaction" : b.description));
        return 0;
    }

    private boolean isDateLine(String line) {
        return DATE_LINE.matcher(line).matches();
    }

    /** Picks the most plausible amount on a line, preferring currency-marked / decimal values. */
    private AmountMatch findAmount(String line) {
        Matcher m = AMOUNT.matcher(line);
        AmountMatch best = null;
        while (m.find()) {
            String symbol = m.group(1);
            String number = m.group(2);
            boolean hasSymbol = symbol != null;
            boolean hasDecimal = number.contains(".");
            boolean hasComma = number.contains(",");
            if (!hasSymbol && !hasDecimal && !hasComma) {
                continue; // skip bare integers (years, IDs, account numbers)
            }
            BigDecimal value = new BigDecimal(number.replace(",", ""));
            if (value.signum() <= 0) {
                continue;
            }
            AmountMatch candidate = new AmountMatch(value, currencyOf(symbol, line),
                    hasSymbol, hasDecimal, m.start());
            if (best == null || candidate.score() >= best.score()) {
                best = candidate;
            }
        }
        return best;
    }

    private static String currencyOf(String symbol, String line) {
        String s = symbol == null ? "" : symbol.toLowerCase(Locale.ROOT);
        if (s.contains("₹") || s.contains("rs") || s.contains("inr")) {
            return "INR";
        }
        if (s.contains("$")) {
            return "USD";
        }
        if (line.contains("₹") || line.toLowerCase(Locale.ROOT).contains("inr")) {
            return "INR";
        }
        return null; // caller substitutes the user's base currency
    }

    private LocalDate findDate(String line) {
        for (DateFormat df : DATE_FORMATS) {
            Matcher m = df.pattern().matcher(line);
            if (m.find()) {
                String candidate = m.group(1).replace(",", " ").replaceAll("\\s+", " ").trim();
                try {
                    return LocalDate.parse(candidate, df.formatter());
                } catch (Exception ignored) {
                    // try the next format
                }
            }
        }
        return null;
    }

    private TransactionType detectType(String line) {
        String lower = " " + line.toLowerCase(Locale.ROOT) + " ";
        long income = INCOME_KEYWORDS.stream().filter(lower::contains).count();
        long expense = EXPENSE_KEYWORDS.stream().filter(lower::contains).count();
        return income > expense ? TransactionType.INCOME : TransactionType.EXPENSE;
    }

    /** Cleans a captured party name into a description. */
    private String trimName(String name) {
        String d = name.replaceAll("\\s+", " ").trim();
        return d.length() > 255 ? d.substring(0, 255) : d;
    }

    /** Builds a description for single-line rows by stripping the date, amount and markers. */
    private String buildDescription(String line) {
        String d = line;
        for (DateFormat df : DATE_FORMATS) {
            d = df.pattern().matcher(d).replaceAll(" ");
        }
        d = AMOUNT.matcher(d).replaceAll(" ");
        d = d.replaceAll("(?i)\\b(debit|credit|dr|cr|inr|rs|usd)\\b", " ");
        d = d.replace("₹", " ").replace("$", " ");
        d = d.replaceAll("\\s+", " ").trim();
        d = d.replaceAll("^[-•:|,.]+", "").trim();
        if (d.isBlank()) {
            d = "Imported transaction";
        }
        return d.length() > 255 ? d.substring(0, 255) : d;
    }

    /** Mutable accumulator for a multi-line transaction block. */
    private static final class Block {
        final LocalDate date;
        TransactionType type;
        String description;
        BigDecimal amount;
        String currency;

        Block(LocalDate date) {
            this.date = date;
        }
    }

    /** A regex paired with the date format its match should be parsed with. */
    private record DateFormat(Pattern pattern, DateTimeFormatter formatter) {
        DateFormat(String regex, String datePattern) {
            this(Pattern.compile(regex),
                    new DateTimeFormatterBuilder().parseCaseInsensitive()
                            .appendPattern(datePattern).toFormatter(Locale.ENGLISH));
        }
    }

    /** A candidate amount with signals used to rank it against others on the same line. */
    private record AmountMatch(BigDecimal value, String currency, boolean hasSymbol,
                               boolean hasDecimal, int position) {
        int score() {
            return (hasSymbol ? 100 : 0) + (hasDecimal ? 10 : 0) + Math.min(position, 9);
        }
    }
}
