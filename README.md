Pricing

I want to integrate stripe payments so users can buy credits 
Check pricing page for the prices

Once logged in users has purchased and the checkout session is sussesful we should
update supabase with the credit so whatever he had left + that amount of ccredits that he purchased and also show a modal with succes you acctound has been added x credits.
If the checkout session is not suscessful and errors out then we can say payment hasnt been processed or something like this no credits has been added to you account.
The modal can use the shdacn modal we alreay use something for when the user trys to do an operation and ddoesnt have enough credits so keep that style.

USD prices
Starter - price_1Qo1M9DPKHEepAzYaeiySo1H
Basic - price_1Qo1MoDPKHEepAzYkf9Wdxrh
Pro - price_1Qo1NtDPKHEepAzYs1Wt1Ki4
Business - price_1Qo1P4DPKHEepAzYukfC0Dbh
Enterprise - price_1Qo1QADPKHEepAzYNs4Re7ey
Ultimate - price_1Qo1QUDPKHEepAzYsSlxW8hr

GBP prices
Starter - price_1Qo2WiDPKHEepAzYjejkU3xj
Basic - price_1Qo2X3DPKHEepAzYZsyzMC5J
Pro - price_1Qo2XMDPKHEepAzYN6gcWel8
Business - price_1Qo2XgDPKHEepAzYPNDGKATB
Enterprise - price_1Qo2Y1DPKHEepAzYXMqFLQsD
Ultimate - price_1Qo2YMDPKHEepAzY5X2VzMJV

Users will land on pricing page from top up modal or by pressing pricing if not logged in or by pressing Credit-based Pricing from footer (maybe we need to udpate the words here as well or maybe not.)

Pricing page general behaviour (no matter if user is logged in or logged out) :
- If the user is from UK then show and use UK prices else show and use USD prices
- If user is not logged it and clicks to buy a package we direct him to sign up which is great.

Behaviuor after user clicks on top up from the modal it shuld be redirected to pricing page.
If the user is logged in:
- start free card should not be rendered becuase he is already a meber
- if the user is from UK we should show and use GBP prices
- if the user is from rest of the world then show and use dollars.

STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET are in env file already

Let me know what if we created a new api so I can add to webhooks in stripe. Also what events shhould i listen to?