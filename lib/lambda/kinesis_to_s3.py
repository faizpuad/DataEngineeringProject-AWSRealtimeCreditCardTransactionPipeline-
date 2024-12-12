#import related libraries

# S3 client initialization
s3_client = boto3.client('s3')

# Constants (e.g., bucket name, desired file size, time duration)
S3_BUCKET_NAME = os.environ['S3_BUCKET_NAME']
DESIRED_FILE_SIZE_BYTES = 1024
MAX_TIME_DURATION = 2

# BufferManager class to handle data buffering and flushing
class BufferManager:
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Resets the buffer state"""
        self.buffer = []
        self.buffer_size = 0
        self.last_flush_time = datetime.now()
        self.flush_trigger = None
        self.headers = None
    
    def should_flush(self):
        """Checks if the buffer should be flushed based on size or time"""
        time_elapsed = (datetime.now() - self.last_flush_time).total_seconds()
        size_threshold_met = self.buffer_size >= DESIRED_FILE_SIZE_BYTES
        time_threshold_met = time_elapsed >= MAX_TIME_DURATION
        
        if size_threshold_met:
            self.flush_trigger = 'size'
        elif time_threshold_met:
            self.flush_trigger = 'time'
        
        return size_threshold_met or time_threshold_met
    
    def force_flush(self):
        """Forces a flush of the buffer"""
        if self.buffer:
            self.flush_trigger = 'final'
            return True
        return False
    
    def add_record(self, data, data_size):
        """Adds a record to the buffer and checks if a flush is needed"""
        # Ensure the data is a dictionary and inspect it
        if not isinstance(data, dict):
            try:
                data = json.loads(data) if isinstance(data, str) else dict(data)
            except (ValueError, TypeError):
                raise ValueError("Invalid data format")
        
        # Set headers if not already set
        if self.headers is None:
            self.headers = list(data.keys())
        
        self.buffer.append(data)
        self.buffer_size += data_size
        
        # Check if the buffer should be flushed
        return self.should_flush()

# Lambda handler function
def handler(event, context):
    start_time = time.time()
    
    # Process incoming event
    if 'Records' in event:
        buffer_manager = BufferManager()
        records_processed = 0
        flushes_performed = 0
        
        for record in event['Records']:
            try:
                payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
                data = json.loads(payload)
                data_size = len(payload.encode('utf-8'))
                
                # Add record and check if a flush is required
                if buffer_manager.add_record(data, data_size):
                    if flush_to_s3(buffer_manager):
                        flushes_performed += 1
                
                records_processed += 1
            except Exception as record_error:
                traceback.print_exc()
        
        # Final flush if needed
        if buffer_manager.buffer:
            if buffer_manager.force_flush():
                if flush_to_s3(buffer_manager):
                    flushes_performed += 1
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Processing completed successfully',
                'recordsProcessed': records_processed,
                'flushesPerformed': flushes_performed
            })
        }
        
    except Exception as e:
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e), 'message': "Error processing records"})
        }
    end_time = time.time()  # End timing
    print(f"Processing Time: {end_time - start_time} seconds")

def flush_to_s3(buffer_manager):
    """Flushes the buffer to S3 as a CSV file"""
    if not buffer_manager.buffer:
        return False
    
    try:
        trigger_type = buffer_manager.flush_trigger or 'unknown'
        
        # Prepare data for CSV upload to S3
        csv_buffer = StringIO()
        csv_writer = csv.DictWriter(csv_buffer, fieldnames=buffer_manager.headers)
        csv_writer.writeheader()
        csv_writer.writerows(buffer_manager.buffer)
        
        # Generate S3 key and upload
        timestamp_str = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        s3_key = f"raw-data/{timestamp_str}-trigger-{trigger_type}-records-{len(buffer_manager.buffer)}-size-{buffer_manager.buffer_size}.csv"
        
        s3_client.put_object(
            Body=csv_buffer.getvalue().encode('utf-8'),
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Metadata={'record_count': str(len(buffer_manager.buffer)), 'buffer_size': str(buffer_manager.buffer_size), 'flush_trigger': trigger_type}
        )
        
        buffer_manager.reset()
        return True
    except Exception as e:
        traceback.print_exc()
        raise
