package com.expensetracker.finance.security;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Initializes the Firebase Admin SDK.
 *
 * <p>Credentials resolution order:
 * <ol>
 *   <li>An explicit service-account JSON file ({@code firebase.credentials-path}).</li>
 *   <li>Application Default Credentials — works automatically on Cloud Run / GCP.</li>
 * </ol>
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${firebase.project-id:}")
    private String projectId;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        GoogleCredentials credentials;
        if (StringUtils.hasText(credentialsPath)) {
            try (InputStream in = new FileInputStream(credentialsPath)) {
                credentials = GoogleCredentials.fromStream(in);
                log.info("Firebase initialized from service-account file: {}", credentialsPath);
            }
        } else {
            credentials = GoogleCredentials.getApplicationDefault();
            log.info("Firebase initialized from Application Default Credentials");
        }

        FirebaseOptions.Builder options = FirebaseOptions.builder().setCredentials(credentials);
        if (StringUtils.hasText(projectId)) {
            options.setProjectId(projectId);
        }
        return FirebaseApp.initializeApp(options.build());
    }
}
