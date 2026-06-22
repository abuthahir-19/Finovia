package com.expensetracker.finance.service.imports;

import com.expensetracker.finance.domain.Category;
import com.expensetracker.finance.domain.TransactionType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Best-effort categorization of an imported transaction by matching merchant/description
 * keywords to a category name, then resolving that name against the user's visible categories.
 * Returns {@code null} when nothing matches (transaction stays uncategorized).
 */
public final class CategoryGuesser {

    /** Keyword -> seeded category name. Order matters: first match wins. */
    private static final Map<String, String> KEYWORDS = new LinkedHashMap<>();

    static {
        put("Dining", "swiggy", "zomato", "restaurant", "cafe", "dominos", "mcdonald",
                "kfc", "pizza", "eatery", "dine", "starbucks", "food", "mess", "hotel",
                "kitchen", "bhavan", "mandi", "sweets", "bakery", "biryani", "tiffin");
        put("Groceries", "bigbasket", "dmart", "supermarket", "blinkit", "zepto",
                "instamart", "grocery", "reliance fresh", "grofers", "vegetable", "stores",
                "store", "rice", "provision");
        put("Transport", "uber", "ola", "rapido", "petrol", "diesel", "fuel", "irctc",
                "metro", "fastag", "parking", "indian oil", "hp petrol", "railway",
                "transport corporation", "state transport", "motors", "tnstc");
        put("Shopping", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "mall",
                "v mart", "saravana");
        put("Utilities", "electricity", "recharge", "broadband", "jio", "airtel", "vodafone",
                "bescom", "gas", "water bill", "dth", "bill payment", "postpaid", "prepaid");
        put("Entertainment", "netflix", "spotify", "hotstar", "prime video", "bookmyshow",
                "movie", "pvr", "inox", "gaming");
        put("Health", "pharmacy", "hospital", "medical", "apollo", "clinic", "medicine",
                "1mg", "pharmeasy", "diagnostic", "medicals");
        put("Rent", "rent", "landlord", "house rent");
        put("Salary", "salary", "payroll", "wages");
        put("Investments", "dividend", "interest", "mutual fund", "zerodha", "groww", "sip");
    }

    private CategoryGuesser() {
    }

    private static void put(String category, String... keywords) {
        for (String k : keywords) {
            KEYWORDS.put(k, category);
        }
    }

    public static Long guess(ParsedTransaction txn, List<Category> visibleCategories) {
        String haystack = txn.description() == null ? "" : txn.description().toLowerCase(Locale.ROOT);
        for (Map.Entry<String, String> entry : KEYWORDS.entrySet()) {
            if (haystack.contains(entry.getKey())) {
                Long id = resolve(entry.getValue(), txn.type(), visibleCategories);
                if (id != null) {
                    return id;
                }
            }
        }
        return null;
    }

    private static Long resolve(String name, TransactionType kind, List<Category> categories) {
        return categories.stream()
                .filter(c -> c.getKind() == kind && c.getName().equalsIgnoreCase(name))
                .map(Category::getId)
                .findFirst()
                .orElse(null);
    }
}
