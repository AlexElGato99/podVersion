# Facebook Merchant Center Integration Setup Guide

This guide walks you through setting up Facebook Merchant Center for your Veliova POD store to automatically publish products to Facebook Shop, dynamic ads, and Instagram Shopping.

## Overview

The Facebook integration works by:
1. **Daily automated feed**: Your products are published via an XML feed at `https://veliova.com/facebook-feed.xml`
2. **Automatic sync**: Every time you add or update a product in Printify/Printful, it's automatically included in the feed
3. **Full variant support**: All size and color variants are included (unlike Pinterest which deduplicates)
4. **Zero setup per product**: New products sync automatically without manual action

## Prerequisites

- A Facebook Business Account (free to create)
- Meta for Developers account (free)
- Access to your Veliova admin dashboard

## Step-by-Step Setup

### Step 1: Create a Facebook Business Account

If you don't already have one:
1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create account" and follow the registration flow
3. Verify your email address

### Step 2: Set Up Meta for Developers App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose "Business" as the app type
4. Fill in the app details:
   - **App name**: "Veliova Product Catalog" (or your preference)
   - **App contact email**: your email
   - **App purpose**: Commerce
5. Click "Create app"

### Step 3: Generate an Access Token

1. In your app dashboard, go to **Settings** → **Basic**
2. Copy your **App ID** and **App Secret** (you'll need the secret later)
3. Go to **Tools** → **Graph API Explorer**
4. Select your app from the "Application" dropdown
5. Next to the token field, click "Get Access Token"
6. In the permissions dialog, search for and select:
   - `catalog:manage`
   - `catalog:read`
7. Click "Generate Access Token"
8. Copy the token (it's long string of characters)

**Important**: This token is sensitive. Treat it like a password. It will be saved encrypted in your Veliova admin settings.

### Step 4: Create a Product Catalog in Facebook Business Manager

1. Go to [business.facebook.com](https://business.facebook.com)
2. In the left sidebar, click **Business Settings**
3. Go to **Catalogs**
4. Click **Create Catalog**
5. Choose "Product" as the catalog type
6. Name it "Veliova Products"
7. In the catalog settings:
   - Set **Catalog type** to "E-commerce"
   - Leave other fields at defaults
8. Copy the **Catalog ID** (visible in the URL or catalog settings)

### Step 5: Save Your Settings in Veliova Admin

1. Log into your Veliova dashboard as an admin
2. Go to **Settings** → **Facebook Shop** tab
3. Fill in the three fields:
   - **Catalog ID**: Paste the Catalog ID from Step 4
   - **Access Token**: Paste the access token from Step 3
   - **Business Account ID**: (Optional) Only needed if you manage multiple business accounts
4. Click **Save changes**

### Step 6: Add the Feed as a Data Source

1. In Facebook Business Manager, go to your Catalog
2. Click **Data Sources**
3. Click **Add Data Source**
4. Choose **XML** as the format
5. In the Veliova admin (same page as Step 5), copy your feed URL from the blue box (looks like `https://veliova.com/facebook-feed.xml`)
6. Paste it into Facebook's data source URL field
7. Set:
   - **Language**: English
   - **Currency**: USD (or your preferred currency)
8. Click **Upload** and let Facebook validate the feed
9. Once validated, schedule the feed to re-upload daily

### Step 7: Verify Your Domain (Recommended)

1. In your catalog settings, go to **Settings** → **Domain verification**
2. Add your domain `veliova.com`
3. Facebook will verify ownership via DNS or meta tag
4. Once verified, conversion attribution improves

### Step 8: Test and Monitor

1. In your catalog, go to **Products**
2. You should see products appearing within a few hours
3. Check **Diagnostics** for any warnings or errors
4. Products with "active" availability will be eligible for ads and the shop

## Feed Content

Your feed includes:
- **All variants**: Every size and color combination is listed separately
- **Product details**:
  - Title, description, price
  - Image (rendered as 2:3 portrait)
  - Stock status (in stock/out of stock)
  - Brand: "Veliova"
  - Category mapping (automatically categorized)
  - Color, size, material (when applicable)

### Pricing and Currency

- Prices are pulled live from Printify/Printful
- Currency is included per-product
- Prices update automatically when you change them in Printify

### Stock Status

- "In stock" = product is offered by your print provider
- "Out of stock" = product has been discontinued
- Print-on-demand products are always considered "in stock" (made to order)

## What's Included vs. What You Need to Do

### Automatic (Handled for You)
✅ Feed generation and hosting
✅ Product syncing
✅ Price updates
✅ Availability status
✅ Image rendering
✅ Variant grouping
✅ Daily feed refresh

### Manual (You Need to Do)
- Create the Facebook business account
- Create the catalog in Business Manager
- Generate and save the access token
- Add the feed to your catalog
- (Optional) Verify your domain
- Create dynamic ads or add products to your shop

## Troubleshooting

### "Feed validation failed"
- Check that the feed URL is accessible by visiting it in your browser
- Make sure the XML is well-formed (no special characters causing issues)
- Try re-adding the data source

### "Some products are missing"
- Check **Diagnostics** in your catalog for specific errors
- Verify the product has an image in Printify
- Make sure the product is active (not archived)
- Check that prices are valid numbers

### "My changes aren't showing"
- The feed is cached for 1 hour on our end
- Facebook re-fetches roughly every 24 hours
- Give it up to 48 hours for large inventory changes

### "Products appear but no stock info"
- Make sure availability status is set correctly in your print provider
- Give the feed 24 hours to refresh after you change stock status

## Creating Ads with Your Products

Once products are in your catalog:

1. Go to **Ads Manager**
2. Create a new campaign with objective "Conversions" or "Catalog Sales"
3. In the ad set, select your catalog
4. Facebook will create dynamic ads showing your products
5. Ads automatically update as products change

### Best Practices

- **Enable dynamic ads**: Let Facebook automatically show relevant products
- **Use retargeting**: Target people who visited your site
- **Test audiences**: Start broad, optimize based on results
- **Monitor costs**: Watch your cost-per-purchase metric

## API vs. Feed Approach

This integration uses the **XML feed approach** (like Pinterest, Google Shopping) rather than the Catalog API. This means:

**Advantages**:
- No ongoing authentication needed
- Feed is public and transparent
- Works reliably at scale
- Same format as Google Shopping (industry standard)
- Easy to debug (you can view the XML directly)

**Limitations**:
- Updates once daily (batch process)
- Not real-time (changes take ~24 hours to appear)

If you need real-time updates, API-based integration can be added later.

## Feed Statistics

In the Facebook Shop settings tab, click **Re-check** to see:
- Total products in feed
- Number of unique designs
- In-stock vs. out-of-stock count
- Sample of products
- Last update time

## Support

For issues with:
- **Facebook setup**: See [Facebook's Merchant Center Help](https://www.facebook.com/business/help/120325701656306)
- **This integration**: Check the Veliova admin dashboard for feed status
- **Product data**: Ensure products are correct in Printify/Printful (they sync automatically)

## Advanced: Customizing the Feed

The feed is generated from your live Printify/Printful catalog. To customize what appears:

1. **Update product titles/descriptions** in Printify → Products → Product details
2. **Change prices** in Printify → Products → Variants → Retail price
3. **Archive products** in Printify to remove them from the feed
4. **Update images** in Printify → Products → Mockups

All changes sync automatically within 1 hour.

## Next Steps After Setup

1. **Create your first dynamic ad** promoting your best sellers
2. **Set up conversion tracking** so you can measure ROI
3. **Monitor Diagnostics** monthly for errors or warnings
4. **Test the Facebook Shop** with your products
5. **Connect to Instagram Shopping** for additional reach

---

**Questions?** Check the Veliova dashboard Settings → Facebook Shop tab for current feed stats and troubleshooting.
