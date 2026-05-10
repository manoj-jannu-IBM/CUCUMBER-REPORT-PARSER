# IBM Watson Setup Guide

This guide will help you get IBM Watson credentials for the AI-powered test analytics platform.

## Step 1: Create an IBM Cloud Account

1. Go to [IBM Cloud](https://cloud.ibm.com/registration)
2. Sign up for a free account (no credit card required for Lite plan)
3. Verify your email address

## Step 2: Create a Watson Machine Learning Service

1. Log in to [IBM Cloud Console](https://cloud.ibm.com/)
2. Click **"Create resource"** in the top right
3. Search for **"Watson Machine Learning"**
4. Select the **Watson Machine Learning** service
5. Choose the **Lite plan** (free tier with 20 capacity unit-hours per month)
6. Select a region (e.g., Dallas, London, Frankfurt)
7. Give it a name (e.g., "test-analytics-ml")
8. Click **"Create"**

## Step 3: Get Your API Key

1. After creating the service, go to your [Resource List](https://cloud.ibm.com/resources)
2. Find your Watson Machine Learning service under **"Services and software"**
3. Click on the service name
4. In the left sidebar, click **"Service credentials"**
5. Click **"New credential"** if none exist
6. Click **"View credentials"** and copy the following:
   - `apikey` - This is your **IBM_WATSON_API_KEY**
   - `url` - This is your **IBM_WATSON_URL**

## Step 4: Create a Watson Studio Project

1. Go to [Watson Studio](https://dataplatform.cloud.ibm.com/)
2. Click **"Create a project"**
3. Select **"Create an empty project"**
4. Give it a name (e.g., "Test Analytics AI")
5. Select or create a Cloud Object Storage instance
6. Click **"Create"**
7. Once created, click on the **"Manage"** tab
8. Copy the **Project ID** - This is your **IBM_WATSON_PROJECT_ID**

## Step 5: Configure Your Application

Update your `.env` file with the credentials:

```env
# IBM Watson Configuration
IBM_WATSON_API_KEY=your_api_key_from_step_3
IBM_WATSON_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSON_PROJECT_ID=your_project_id_from_step_4
IBM_WATSON_MODEL=ibm/granite-13b-chat-v2
```

## Available Models

IBM Watson offers several models you can use:

### Free Tier Models (Lite Plan):
- `ibm/granite-13b-chat-v2` - General purpose chat model (recommended)
- `ibm/granite-13b-instruct-v2` - Instruction-following model
- `meta-llama/llama-3-8b-instruct` - Meta's Llama 3 model
- `google/flan-t5-xxl` - Google's T5 model

### Premium Models (Paid plans):
- `meta-llama/llama-3-70b-instruct` - Larger Llama model
- `ibm/granite-20b-multilingual` - Multilingual support

## Pricing

### Lite Plan (Free):
- 20 capacity unit-hours per month
- Access to select models
- No credit card required
- Perfect for development and testing

### Standard Plan:
- Pay-as-you-go pricing
- $0.50 per capacity unit-hour
- Access to all models
- Production-ready

## Troubleshooting

### Error: "Unauthorized" or "Invalid API Key"
- Verify your API key is correct in `.env`
- Ensure the Watson ML service is active in IBM Cloud
- Check that your API key hasn't expired

### Error: "Project not found"
- Verify your PROJECT_ID is correct
- Ensure the project exists in Watson Studio
- Check that the project is associated with your Watson ML service

### Error: "Model not found"
- Verify the model name is correct
- Check if the model is available in your region
- Try using `ibm/granite-13b-chat-v2` as a default

### Rate Limiting
- Free tier has 20 capacity unit-hours per month
- Monitor usage in IBM Cloud dashboard
- Consider upgrading to Standard plan for production

## Additional Resources

- [IBM Watson Documentation](https://cloud.ibm.com/docs/watson-machine-learning)
- [WatsonX.ai Models](https://www.ibm.com/products/watsonx-ai/foundation-models)
- [IBM Cloud Support](https://cloud.ibm.com/unifiedsupport/supportcenter)
- [Pricing Calculator](https://cloud.ibm.com/estimator)

## Support

For issues with IBM Watson:
- [IBM Cloud Support Center](https://cloud.ibm.com/unifiedsupport/supportcenter)
- [Community Forums](https://community.ibm.com/community/user/watsonai/home)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/ibm-watson)

---

**Note**: The free Lite plan is sufficient for development and testing. You can upgrade to a paid plan when moving to production.