# import relevant libraries

def handler(event, context):
    # Start timer
    start_time = time.time()

    try:
        # Retrieve database credentials from a secure source
        credentials = get_secret("goal3-secrets", "us-east-2")

        # Extract file details from S3 event
        bucket_name, object_key = extract_s3_details(event)

        # Download and process the file from S3
        file_data = fetch_file_from_s3(bucket_name, object_key)
        data_frame = load_csv_to_dataframe(file_data)

        # Connect to the database and upsert data
        upsert_data_to_db(credentials, data_frame)

    except Exception as error:
        print(f"Processing failed: {str(error)}")
        handle_error(event, error)

    finally:
        # Log processing time
        print(f"Processing time: {time.time() - start_time} seconds")

    return {'statusCode': 200, 'body': 'Data processed successfully.'}

def get_secret(secret_name, region):
    """Retrieve secret credentials from Secrets Manager"""
    client = boto3.client('secretsmanager', region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

def extract_s3_details(event):
    """Extract bucket name and object key from the event"""
    s3_event = event['Records'][0]
    return s3_event['s3']['bucket']['name'], s3_event['s3']['object']['key']

def fetch_file_from_s3(bucket_name, object_key):
    """Retrieve file content from S3"""
    s3_client = boto3.client('s3')
    file_obj = s3_client.get_object(Bucket=bucket_name, Key=object_key)
    return file_obj['Body'].read().decode('utf-8')

def load_csv_to_dataframe(file_data):
    """Load CSV data into a pandas DataFrame"""
    try:
        return pd.read_csv(StringIO(file_data))
    except Exception as e:
        print(f"Error loading CSV: {e}")
        raise

def upsert_data_to_db(credentials, data_frame):
    """Insert or update data into the database"""
    try:
        conn = psycopg2.connect(**credentials)
        cursor = conn.cursor()

        # Ensure schema and table existence
        ensure_schema_and_table(cursor, data_frame.columns)

        # Upsert data
        upsert_rows(cursor, data_frame)

        conn.commit()
    except Exception as e:
        print(f"Database error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def ensure_schema_and_table(cursor, columns):
    """Ensure schema and table are ready for data insertion"""
    cursor.execute("CREATE SCHEMA IF NOT EXISTS test_schema;")
    column_definitions = ', '.join([f"{col} TEXT" for col in columns])
    create_table_query = f"""
        CREATE TABLE IF NOT EXISTS test_schema.invoice_data (
            {column_definitions}
        );
    """
    cursor.execute(create_table_query)

def upsert_rows(cursor, data_frame):
    """Insert data rows into the table using upsert strategy"""
    for _, row in data_frame.iterrows():
        upsert_query = f"""
            INSERT INTO test_schema.invoice_data ({', '.join(data_frame.columns)})
            VALUES ({', '.join(['%s'] * len(data_frame.columns))})
            ON CONFLICT DO NOTHING;
        """
        cursor.execute(upsert_query, tuple(row))

def handle_error(event, error):
    """Handle errors by moving faulty data to a special folder"""
    bucket_name, object_key = extract_s3_details(event)
    s3_client = boto3.client('s3')
    new_key = f"faulty-data/{datetime.now().strftime('%Y%m%d%H%M%S')}_{object_key.split('/')[-1]}"
    s3_client.copy_object(
        Bucket=bucket_name,
        CopySource={'Bucket': bucket_name, 'Key': object_key},
        Key=new_key
    )
    s3_client.delete_object(Bucket=bucket_name, Key=object_key)
    print(f"Faulty file moved to {new_key}.")