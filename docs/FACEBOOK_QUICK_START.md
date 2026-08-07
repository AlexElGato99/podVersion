# Facebook Merchant Center - Quick Start (5 min setup)

## TL;DR

Get your products on Facebook in 3 steps:

1. **Get credentials** (5 min):
   - Create app at [developers.facebook.com](https://developers.facebook.com)
   - Get Catalog ID at [business.facebook.com](https://business.facebook.com)
   - Generate access token with `catalog:manage` permission

2. **Save in admin** (1 min):
   - Veliova dashboard → Settings → Facebook Shop
   - Paste Catalog ID, Access Token
   - Click Save

3. **Add to Facebook** (2 min):
   - Copy feed URL from settings
   - Facebook Business Manager → Catalogs → Add Data Source
   - Paste URL, validate, done!

**Total time: ~8 minutes**

---

## Detailed Quick Start

### Part 1: Create Meta App (if you don't have one)

1. Go to https://developers.facebook.com
2. Click "My Apps" → "Create App"
3. Choose "Business"
4. Fill in basic info and click "Create app"

### Part 2: Get Your Catalog ID

1. Go to https://business.facebook.com
2. Settings → Catalogs
3. Click "Create Catalog" → "Product Catalog"
4. Name it "Veliova Products"
5. Copy the Catalog ID (big number in URL or settings)

### Part 3: Generate Access Token

1. Back in Meta for Developers
2. Your App → Tools → Graph API Explorer
3. Click "Get Access Token"
4. Find and check:
   - ☐ `catalog:manage`
   - ☐ `catalog:read`
5. Click "Generate Access Token"
6. Copy the token (long string)

### Part 4: Save in Veliova Admin

1. Open Veliova dashboard (admin account)
2. Settings → Facebook Shop tab
3. Fill in:
   - **Catalog ID**: Paste from Part 2
   - **Access Token**: Paste from Part 3
   - **Business Account ID**: (leave blank, optional)
4. Click "Save changes"
5. Wait for success message
6. **Copy your feed URL** from the blue box below

### Part 5: Add Feed to Facebook

1. Go to Business Manager
2. Your Catalog → Data Sources
3. Click "Add Data Source"
4. Choose "XML" format
5. Paste your feed URL (from Veliova)
6. Settings:
   - Language: English
   - Currency: USD
7. Click Upload
8. Wait for validation (usually < 1 hour)

### Done! 🎉

Your products will appear in Facebook within 24 hours. You're ready to:
- Create dynamic ads
- Set up Facebook Shop
- Link to Instagram Shopping
- Use product catalogs

---

## What Happens Next

| When | What |
|------|------|
| **Now** | Feed URL is live |
| **< 1 hr** | Facebook validates feed |
| **< 24 hr** | Products appear in your catalog |
| **Daily** | Facebook re-fetches feed automatically |
| **Automatic** | New products sync when added to Printify |

---

## Troubleshooting

### "I can't find my Catalog ID"
- Business.facebook.com → Settings → Catalogs
- Or look in URL when viewing catalog

### "Access Token generation failed"
- Make sure you selected BOTH permissions
- Try in Graph API Explorer (not via app settings)
- Token must be generated, not pasted from elsewhere

### "Feed validation failed"
- Check feed URL is correct (visit in browser)
- Try adding data source again
- Check Veliova admin shows green success message

### "Products not showing after 24 hours"
- Go to your Catalog → Diagnostics
- Look for error messages
- Verify products exist in Printify (not archived)
- Products must have images

### "How do I create an ad with my products?"
- Ads Manager → Create Campaign
- Objective: Conversions or Catalog Sales
- In Ad Set, select your catalog
- Design will pull from product feed automatically

---

## Commands to Check Setup

**View your feed**:
```bash
curl https://veliova.com/facebook-feed.xml | head -100
```

**Check product count**:
- Veliova admin → Settings → Facebook Shop → Re-check

**View Facebook product count**:
- Business.facebook.com → Your Catalog → Products

---

## Key Info to Keep Safe

Save these somewhere secure:
- [ ] Catalog ID: `__________________`
- [ ] Access Token: `__________________`
- [ ] Feed URL: `https://veliova.com/facebook-feed.xml`

⚠️ **Treat the Access Token like a password!**

---

## Next Steps (Optional)

1. **Create your first dynamic ad**
   - Ads Manager → New Campaign
   - Auto-use products from your catalog

2. **Verify your domain**
   - Business Manager → Your Catalog → Domain Verification
   - Improves tracking and trust

3. **Set up conversion tracking**
   - Track which ads drive sales
   - (Use existing Meta Pixel if set up)

4. **Go live with ads**
   - Start with small budget
   - Monitor performance after 24 hours
   - Scale what works

---

## Support

- **Facebook help**: https://www.facebook.com/business/help
- **Veliova admin dashboard**: Check Settings → Facebook Shop for feed status
- **Feed working?**: Click "Re-check" to see latest stats

---

**That's it!** You now have a live product catalog syncing automatically to Facebook. Every new product added to Printify will appear in your Facebook catalog within 24 hours.

🚀 **Ready to create ads?** → Go to Ads Manager and start building!
