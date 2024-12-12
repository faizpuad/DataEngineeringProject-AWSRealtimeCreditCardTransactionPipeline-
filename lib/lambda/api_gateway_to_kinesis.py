#import related libraries

# Lambda function to handle API Gateway events and send data to Kinesis Data Stream
def handler(event, context):
    # Start tracking execution time
    start_time = time.time()
    print("Processing API Gateway to Kinesis request")

    # Log the incoming event
    print("Received Event:")
    print(event)

    # Extract HTTP method (GET or POST)
    method = event['httpMethod']

    # Handle GET request
    if method == "GET":
        # Return a success response for GET method
        end_time = time.time()  # End timing
        print(f"Processing Time: {end_time - start_time} seconds")
        return {
            'statusCode': 200,
            'body': json.dumps("GET method successful! Thanks for Get-ting by!")
        }

    # Handle POST request
    elif method == "POST":
        # Extract and prepare data from the POST body
        p_record = event['body']  
        record_string = json.dumps(p_record)

        # Create a Kinesis client and send data to stream
        client = boto3.client('kinesis')
        response = client.put_record(
            StreamName=os.environ['KINESIS_STREAM_NAME'],  # Use stream name from environment variable
            Data=record_string,
            PartitionKey='string'  # Partition key for the stream
        )

        # Return the posted record back as confirmation
        end_time = time.time()  # End timing
        print(f"Processing Time: {end_time - start_time} seconds")
        return {
            'statusCode': 200,
            'body': json.dumps(p_record)
        }

    # Handle unsupported HTTP methods
    else:
        end_time = time.time()  # End timing
        print(f"Processing Time: {end_time - start_time} seconds")
        return {
            'statusCode': 501,
            'body': json.dumps("Server Error")
        }
