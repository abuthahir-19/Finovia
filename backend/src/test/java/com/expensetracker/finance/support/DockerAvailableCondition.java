package com.expensetracker.finance.support;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

/**
 * JUnit 5 {@link ExecutionCondition} that disables a test class when no Docker engine
 * is reachable. Evaluated <em>before</em> Testcontainers' {@code BeforeAllCallback}, so the
 * test is cleanly skipped (not errored) on machines without Docker — e.g. local builds when
 * Docker Desktop is stopped. CI environments with Docker run the test normally.
 */
public class DockerAvailableCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            if (DockerClientFactory.instance().isDockerAvailable()) {
                return ConditionEvaluationResult.enabled("Docker is available");
            }
        } catch (Throwable ignored) {
            // Any probe failure is treated as "Docker unavailable".
        }
        return ConditionEvaluationResult.disabled(
                "Docker is not available — skipping Testcontainers integration test");
    }
}
