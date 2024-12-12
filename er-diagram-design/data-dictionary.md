### This is the data dictionary for credit card transaction:

| **Attribute**              | **Description**                        |
|----------------------------|----------------------------------------|
| `trans_date_trans_time`   | Transaction date and time                     |
| `cc_num`                  | Credit card number                            |
| `merchant`                | Merchant name                                 |
| `category`                | Merchant category                             |
| `amt`                     | Transaction amount                            |
| `first`                   | First name of credit card holder              |
| `last`                    | Last name of credit card holder               |
| `gender`                  | Gender of credit card holder                  |
| `street`                  | Street address of credit card holder          |
| `city`                    | City of credit card holder                    |
| `state`                   | State of credit card holder                   |
| `zip`                     | ZIP code of credit card holder                |
| `lat`                     | Latitude of credit card holder's location     |
| `long`                    | Longitude of credit card holder's location    |
| `city_pop`                | Population of the cardholder's city           |
| `job`                     | Job of the credit card holder                 |
| `dob`                     | Date of birth of credit card holder           |
| `trans_num`               | Unique transaction identifier                 |
| `unix_time`               | Unix timestamp for the transaction            |
| `merch_lat`               | Latitude of the merchant's location           |
| `merch_long`              | Longitude of the merchant's location          |
| `is_fraud`                | Fraud flag (Target variable: 1 = Fraud, 0 = Not Fraud) |