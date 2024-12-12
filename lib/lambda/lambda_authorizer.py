# import related libraries

def handler(event, context):
    # Start the timer to track the processing duration
    start_time = time.time()

    try:
        # Extract the token from the event
        token = extract_token(event)
        
        # Validate the token and prepare the response
        if validate_token(token):
            return generate_policy('user', 'Allow', event['methodArn'], generate_user_info())
        
        # If token is invalid, deny access
        return generate_policy('user', 'Deny', event['methodArn'])

    except Exception as error:
        # Handle errors and return a denial policy
        print(f"Authorization failed: {str(error)}")
        return generate_policy('user', 'Deny', event['methodArn'])

    finally:
        # Track and print the processing time
        print(f"Processing time: {time.time() - start_time} seconds")

def extract_token(event):
    """Extract the authorization token from the event"""
    token = event.get('authorizationToken', '')
    return token.replace('Bearer ', '') if 'Bearer ' in token else token

def validate_token(token):
    """Check if the provided token is valid"""
    valid_token = os.getenv('AUTHORIZER_TOKEN', 'default-token')
    return token == valid_token

def generate_user_info():
    """Generate user information to be attached to the policy"""
    return {
        'userID': 'user-1234',
        'userRole': 'admin'
    }

def generate_policy(principal_id, effect, resource, context=None):
    """Create an IAM policy document for API Gateway"""
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        }
    }
    if context:
        policy['context'] = context
    return policy