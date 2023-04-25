const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    
    
    
    const requestBody = event.queryStringParameters;
    
    let errorMessage = "Your request could not be completed. ";
    
    let state = requestBody.State;
    let postalCode = requestBody.PostalCode;
    let incomeLevel = requestBody.IncomeLevel;
    
    const normalizedState = normalizeStateValue(state);
    const normalizedPostal = normalizePostalCodeValue(postalCode);
    const normalizedIncome = normalizeIncomeLevelValue(incomeLevel);
    
    let invalidInputs = false;
    
    if(!normalizedState[1]){
        errorMessage += 'The value you submitted for state, ' + normalizedState[0] + ', was invalid. Please enter either a full US state name or abbreviation. '
        invalidInputs = true;
    }
    
    if(!normalizedPostal[1]){
        errorMessage += 'The value you submitted for postal code, ' + normalizedPostal[0] + ', was invalid. Please enter this value in the format 12345-6789. '
        invalidInputs = true;
    }
    
    if(!normalizedIncome[1]){
        errorMessage += 'The value you submitted for income, ' + normalizedIncome[0] + ', was invalid. Please enter a value of "$1 under $25,000","$25,000 under $50,000","$50,000 under $75,000","$75,000 under $100,000","$100,000 under $200,000","$200,000 or more". ';
        invalidInputs = true;
    }
    
    if(invalidInputs){
         errorResponse(errorMessage, context.awsRequestId, callback);
    }else{
        const constructedID = constructDynamoDBID({
            normalizedIncomeValue : normalizedIncome[2],
            normalizedStateValue : normalizedState[2],
            normalizedPostalValue : normalizedPostal[2]
        });
        getTaxReturnsFromDatabase(constructedID).then((data) => {
            callback(null, {
                statusCode: 201,
                body: JSON.stringify(data),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            });
            }).catch((err) => {
            console.error(err);
    
            // If there is an error during processing, catch it and return
            // from the Lambda function successfully. Specify a 500 HTTP status
            // code and provide an error message in the body. This will provide a
            // more meaningful error response to the end client.
            errorResponse(err.message, context.awsRequestId, callback)
        });
    }

    
    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify(requestBody)
    };
    
    return response;
};

function constructDynamoDBID(inputValues){
    const constructedString = inputValues.normalizedIncomeValue.toString() + inputValues.normalizedStateValue + inputValues.normalizedPostalValue.toString();
    return constructedString;
    
}

function normalizeIncomeLevelValue(incomeLevel){
    
    let normalizedIncomeLevel = incomeLevel;
    
    let validValue = false;
    
    const potentialIncomeLevelValues = [1,2,3,4,5,6,"1","2","3","4","5","6","$1 under $25,000","$25,000 under $50,000","$50,000 under $75,000","$75,000 under $100,000","$100,000 under $200,000","$200,000 or more"];
    
    if(potentialIncomeLevelValues.includes(incomeLevel)){
        validValue = true;
    }
    
    if(incomeLevel.toString().length > 1){
        switch(incomeLevel){
            case "$1 under $25,000":
                normalizedIncomeLevel = 1;
            case "$25,000 under $50,000":
                normalizedIncomeLevel = 2;
            case "$50,000 under $75,000":
                normalizedIncomeLevel = 3;
            case "$75,000 under $100,000":
                normalizedIncomeLevel = 4;
            case "$100,000 under $200,000":
                normalizedIncomeLevel = 5;
            case "$200,000 or more":
                normalizedIncomeLevel = 6;
        }
    }
    
    return [incomeLevel, validValue, normalizedIncomeLevel];
}

function normalizePostalCodeValue(postalCode){
    
    let normalizedPostalCode = postalCode;
    
    let validValue = false;
    
    const regularZipCodeExpression = new RegExp("^[0-9]{5}(?:-[0-9]{4})?$");
    
    validValue = regularZipCodeExpression.test(postalCode);
    
    if(validValue && postalCode.length == 10){
        normalizedPostalCode = postalCode.substring(0,5);
    }
    
    return [postalCode, validValue, normalizedPostalCode];

}


function normalizeStateValue(stateValue){
    
    let normalizedStateValue = stateValue;
    
    let validValue = false;
    
    const stateValues = ["Alabama", "Alaska", "American Samoa", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Guam", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Minor Outlying Islands", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Northern Mariana Islands", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "U.S. Virgin Islands", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
    
    const stateValuesAbbreviated = ["AK", "AL", "AR", "AS", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "GU", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MP", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UM", "UT", "VA", "VI", "VT", "WA", "WI", "WV", "WY"];
    
    if(stateValue.length == 2 && !stateValuesAbbreviated.includes(stateValue)){
        validValue = false;
    }
    
    if(stateValue.length > 2 && !stateValues.includes(stateValue)){
        validValue = false;
    }else{
        validValue = true;
        switch(stateValue){
            case "Alaska":
                normalizedStateValue = "AK";
                break;
            case "Alabama":
                normalizedStateValue = "AL";
                break;
            case "Arkansas":
                normalizedStateValue = "AR";
                break;
            case "Arizona":
                normalizedStateValue = "AZ";
                break;
            case "California":
                normalizedStateValue = "CA";
                break;
            case "Colorado":
                normalizedStateValue = "CO";
                break;
            case "Connecticut":
                normalizedStateValue = "CT";
                break;
            case "Delaware":
                normalizedStateValue = "DE";
                break;
            case "Florida":
                normalizedStateValue = "FL";
                break;
            case "Georgia":
                normalizedStateValue = "GA";
                break;
            case "Hawaii":
                normalizedStateValue = "HI";
                break;
            case "Iowa":
                normalizedStateValue = "IA";
                break;
            case "Idaho":
                normalizedStateValue = "ID";
                break;
            case "Illinois":
                normalizedStateValue = "IL";
                break;
            case "Indiana":
                normalizedStateValue = "IN";
                break;
            case "Kansas":
                normalizedStateValue = "KS";
                break;
            case "Kentucky":
                normalizedStateValue = "KY";
                break;
            case "Louisiana": 
                normalizedStateValue = "LA";
                break;
            case "Massachusetts":
                normalizedStateValue = "MA";
                break;
            case "Maryland":
                normalizedStateValue = "MD";
                break;
            case "Maine":
                normalizedStateValue = "ME";
                break;
            case "Michigan":
                normalizedStateValue = "MI";
                break;
            case "Minnesota":
                normalizedStateValue = "MN";
                break;
            case "Missouri":
                normalizedStateValue = "MO";
                break;
            case "Mississippi":
                normalizedStateValue = "MS";
                break;
            case "Montana":
                normalizedStateValue = "MT";
                break;
            case "North Carolina":
                normalizedStateValue = "NC";
                break;
            case "North Dakota":
                normalizedStateValue = "ND";
                break;
            case "Nebraska":
                normalizedStateValue = "NE";
                break;
            case "New Hampshire":
                normalizedStateValue = "NH";
                break;
            case "New Jersey":
                normalizedStateValue = "NJ";
                break;
            case "New Mexico":
                normalizedStateValue = "NM";
                break;
            case "Nevada":
                normalizedStateValue = "NV";
                break;
            case "New York":
                normalizedStateValue = "NY";
                break;
            case "Ohio":
                normalizedStateValue = "OH";
                break;
            case "Oklahoma":
                normalizedStateValue = "OK";
                break;
            case "Oregon":
                normalizedStateValue = "OR";
                break;
            case "Pennsylvania":
                normalizedStateValue = "PA";
                break;
            case "Rhode Island":
                normalizedStateValue = "RI";
                break;
            case "South Carolina":
                normalizedStateValue = "SC";
                break;
            case "South Dakota":
                normalizedStateValue = "SD";
                break;
            case "Tennessee":
                normalizedStateValue = "TN";
                break;
            case "Texas":
                normalizedStateValue = "TX";
                break;
            case "Utah":
                normalizedStateValue = "UT";
                break;
            case "Virginia":
                normalizedStateValue = "VA";
                break;
            case "Vermont": 
                normalizedStateValue = "VT";
                break;
            case "Washington":
                normalizedStateValue = "WA";
                break;
            case "Wisconsin":
                normalizedStateValue = "WI";
                break;
            case "West Virginia":
                normalizedStateValue = "WV";
                break;
            case "Wyoming": 
                normalizedStateValue = "WY";
                break;
            case "District of Columbia":
                normalizedStateValue = "DC";
                break;
        }
    }
    
    return [stateValue, validValue, normalizedStateValue]; 
    
}

function getTaxReturnsFromDatabase(constructedID) {
    
    let params = {
        TableName: 'US_Income_Tax_Returns',
        Key: {
            ID: constructedID
        }
    };
    return ddb.get( params,function(err, data) {
      if(err){
          console.log(err, err.stack)
        }else{
            console.log(data); 
        }
    }
    ).promise();
}


function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
