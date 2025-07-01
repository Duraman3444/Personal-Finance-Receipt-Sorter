import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_KEY 
});

// Sample OCR text from a receipt
const sampleOcrText = `
WALMART SUPERCENTER
STORE #1234
123 MAIN ST
ANYTOWN, ST 12345

GREAT VALUE MILK 1GAL      $3.98
BANANAS 2.5 LB @ $0.68/LB  $1.70
BREAD WHITE LOAF           $1.28
EGGS LARGE DOZEN           $2.49

SUBTOTAL                   $9.45
TAX                        $0.76
TOTAL                     $10.21

VISA ENDING IN 1234       $10.21
CHANGE                     $0.00

THANK YOU FOR SHOPPING
06/30/2024 15:30:22
`;

// Receipt parsing schema for OpenAI function calling
const receiptSchema = {
  name: "parse_receipt",
  description: "Extract key data from a purchase receipt",
  parameters: {
    type: "object",
    properties: {
      vendor: { 
        type: "string", 
        description: "The store or vendor name" 
      },
      date: { 
        type: "string", 
        format: "date",
        description: "Purchase date in YYYY-MM-DD format" 
      },
      total: { 
        type: "number", 
        description: "Total amount paid" 
      },
      tax: { 
        type: "number", 
        description: "Tax amount" 
      },
      currency: { 
        type: "string", 
        default: "USD",
        description: "Currency code" 
      },
      payment_method: { 
        type: "string", 
        description: "Payment method used (cash, credit, debit, etc.)" 
      },
      category: {
        type: "string",
        enum: ["Groceries", "Dining", "Travel", "Utilities", "Shopping", "Gas", "Healthcare", "Entertainment", "Other"],
        description: "Spending category that best fits this purchase"
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
            quantity: { type: "number", default: 1 }
          }
        },
        description: "Individual items purchased (optional)"
      }
    },
    required: ["vendor", "date", "total", "category"]
  }
};

async function testReceiptParsing() {
  console.log('🧾 Testing Receipt Parsing with OpenAI...\n');
  
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_KEY || process.env.OPENAI_KEY === 'your-openai-api-key-here') {
      console.log('❌ OpenAI API key not configured');
      console.log('Please set OPENAI_KEY in your .env file');
      return;
    }

    console.log('📝 Sample OCR Text:');
    console.log(sampleOcrText);
    console.log('\n🤖 Sending to OpenAI for parsing...\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a receipt parsing assistant. Extract key information from receipt text and return it in the specified JSON format." 
        },
        {
          role: "user",
          content: `Extract the following fields from this receipt OCR text:\n\n${sampleOcrText}`
        }
      ],
      functions: [receiptSchema],
      function_call: { name: "parse_receipt" }
    });

    const functionCall = response.choices[0].message.function_call;
    if (functionCall && functionCall.arguments) {
      const parsedData = JSON.parse(functionCall.arguments);
      
      console.log('✅ Successfully parsed receipt!');
      console.log('📊 Extracted Data:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Validate required fields
      const requiredFields = ['vendor', 'date', 'total', 'category'];
      const missingFields = requiredFields.filter(field => !parsedData[field]);
      
      if (missingFields.length > 0) {
        console.log(`\n⚠️  Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('\n✅ All required fields present!');
      }
      
      return parsedData;
    } else {
      console.log('❌ No function call returned from OpenAI');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing receipt parsing:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Run the test
testReceiptParsing()
  .then((result) => {
    if (result) {
      console.log('\n🎉 Receipt parsing test completed successfully!');
      console.log('Ready to integrate with n8n workflow.');
    } else {
      console.log('\n💥 Receipt parsing test failed.');
      console.log('Please check your OpenAI API key and try again.');
    }
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
  }); 