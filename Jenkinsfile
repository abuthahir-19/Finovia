pipeline {
    agent any

    environment {
        // === Basic App Info ===
        APP_NAME          = 'finance-api'
        IMAGE_TAG         = "${env.BUILD_NUMBER}"   // Use build number for versioning

        // === GCP Configuration ===
        GCP_PROJECT       = "${env.GCP_PROJECT_ID}"
        REGION            = 'asia-south1'
        ARTIFACT_REGISTRY = 'asia-south1-docker.pkg.dev'
        REPO_NAME         = 'finance'
        CLOUD_RUN_SERVICE = 'finance-api'

        // === Control Flags (set to 'true' during initial local testing) ===
        SKIP_GCP_PUSH     = 'false'
        SKIP_CLOUD_RUN    = 'false'
        SKIP_FRONTEND     = 'false'
    }

    tools {
        maven 'Maven3'
        jdk 'JDK21'
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
                echo "✅ Code checked out successfully"
            }
        }

        stage('Build & Run Tests') {
            steps {
                dir('backend') {
                    sh 'mvn clean package --no-transfer-progress'
                }
                echo "✅ Maven build and tests completed successfully"
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    try {
                        sh "docker build -t ${APP_NAME}:${IMAGE_TAG} ./backend"
                        echo "✅ Docker image built locally: ${APP_NAME}:${IMAGE_TAG}"
                    } catch (err) {
                        error "❌ Docker build failed: ${err}"
                    }
                }
            }
        }

        stage('Push Image to Artifact Registry') {
            when {
                expression { SKIP_GCP_PUSH == 'false' }
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-secret-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                        echo "🔐 Authenticating with GCP using service account..."
                        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                        gcloud auth configure-docker ${ARTIFACT_REGISTRY} --quiet

                        echo "🚀 Pushing image to Artifact Registry..."
                        docker tag ${APP_NAME}:${IMAGE_TAG} ${ARTIFACT_REGISTRY}/${GCP_PROJECT}/${REPO_NAME}/${APP_NAME}:${IMAGE_TAG}
                        docker push ${ARTIFACT_REGISTRY}/${GCP_PROJECT}/${REPO_NAME}/${APP_NAME}:${IMAGE_TAG}
                    '''
                }
                echo "✅ Image successfully pushed to Artifact Registry"
            }
        }

        stage('Deploy to Cloud Run Service') {
            when {
                expression { SKIP_CLOUD_RUN == 'false' }
            }
            steps {
                // The service is created once with full config (env vars, Cloud SQL, secret,
                // runtime SA) per infra/DEPLOYMENT.md; the pipeline only rolls the new image.
                withCredentials([file(credentialsId: 'gcp-secret-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                        gcloud run services update ${CLOUD_RUN_SERVICE} \
                          --image ${ARTIFACT_REGISTRY}/${GCP_PROJECT}/${REPO_NAME}/${APP_NAME}:${IMAGE_TAG} \
                          --region ${REGION} \
                          --project ${GCP_PROJECT} \
                          --quiet
                    '''
                }
                echo "✅ Cloud Run service updated with new image"
            }
        }

        stage('Build Frontend') {
            when {
                expression { SKIP_FRONTEND == 'false' }
            }
            steps {
                // Firebase web config + API base URL come from a Jenkins "Secret file"
                // credential containing frontend/.env.production.
                withCredentials([file(credentialsId: 'finovia-frontend-env', variable: 'FE_ENV')]) {
                    dir('frontend') {
                        sh 'cp "$FE_ENV" .env.production'
                        sh 'npm ci'
                        sh 'npm run build'
                    }
                }
                echo "✅ Frontend built successfully"
            }
        }

        stage('Deploy Frontend to Firebase Hosting') {
            when {
                expression { SKIP_FRONTEND == 'false' }
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-secret-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh 'npx --yes firebase-tools deploy --only hosting --project ${GCP_PROJECT} --non-interactive'
                }
                echo "✅ Frontend deployed to Firebase Hosting"
            }
        }
    }

    post {
        success {
            echo '🎉 Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above.'
        }
    }
}
