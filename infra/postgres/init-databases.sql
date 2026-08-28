-- Create one database per microservice (database-per-service pattern)
CREATE DATABASE contract_db;
CREATE DATABASE pricing_db;
CREATE DATABASE operation_db;
CREATE DATABASE billing_db;
CREATE DATABASE workflow_db;
CREATE DATABASE support_db;

GRANT ALL PRIVILEGES ON DATABASE contract_db TO udpt;
GRANT ALL PRIVILEGES ON DATABASE pricing_db TO udpt;
GRANT ALL PRIVILEGES ON DATABASE operation_db TO udpt;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO udpt;
GRANT ALL PRIVILEGES ON DATABASE workflow_db TO udpt;
GRANT ALL PRIVILEGES ON DATABASE support_db TO udpt;
