"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  Headphones,
  MessageSquareText,
  FileText,
  Image,
} from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { BackgroundDecorations } from "@/components/background-decorations";
import { AuthButton } from "@/components/auth-button";
import { PaymentStatusModal } from "@/components/payment-status-modal";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { loadStripe, Stripe } from "@stripe/stripe-js";

// Add debug logging to track initialization
const DEBUG = process.env.NODE_ENV === "development";

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("Stripe publishable key is not configured");
}

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = async () => {
  if (typeof window === "undefined") {
    console.error("Stripe cannot be loaded server-side");
    return null;
  }

  try {
    if (!stripePromise) {
      if (DEBUG) console.log("Initializing Stripe...");

      // Add a small delay before loading Stripe to ensure headers are properly set
      await new Promise((resolve) => setTimeout(resolve, 100));

      stripePromise = loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        {
          apiVersion: "2023-10-16", // Specify latest API version
        }
      )
        .then((stripe) => {
          if (DEBUG) console.log("Stripe loaded successfully");
          return stripe;
        })
        .catch((error) => {
          console.error("Stripe loading error details:", {
            message: error.message,
            type: error.type,
            stack: error.stack,
            browserInfo: {
              userAgent: window.navigator.userAgent,
              vendor: window.navigator.vendor,
              platform: window.navigator.platform,
            },
          });
          // Clear the promise so it can be retried
          stripePromise = null;
          return null;
        });
    }

    const stripe = await stripePromise;
    if (!stripe) {
      // If stripe is null, clear the promise to allow retry
      stripePromise = null;
    }
    return stripe;
  } catch (error) {
    console.error("Unexpected error during Stripe initialization:", error);
    stripePromise = null;
    return null;
  }
};

const packages = [
  {
    name: "Starter",
    credits: 2000,
    price: 2,
    priceId: "price_1Qo1M9DPKHEepAzYaeiySo1H", // USD
    gbpPriceId: "price_1Qo2WiDPKHEepAzYjejkU3xj", // GBP
    features: [
      "~110 minutes of audio transcription",
      "~12 million words of text-to-speech",
      "~15 document pages processing",
      "~10 images scanned for text (OCR)",
    ],
  },
  {
    name: "Basic",
    credits: 5000,
    price: 5,
    priceId: "price_1Qo1MoDPKHEepAzYkf9Wdxrh", // USD
    gbpPriceId: "price_1Qo2X3DPKHEepAzYZsyzMC5J", // GBP
    features: [
      "~275 minutes of audio transcription",
      "~30 million words of text-to-speech",
      "~40 document pages processing",
      "~25 images scanned for text (OCR)",
    ],
  },
  {
    name: "Pro",
    credits: 10000,
    price: 10,
    priceId: "price_1Qo1NtDPKHEepAzYs1Wt1Ki4", // USD
    gbpPriceId: "price_1Qo2XMDPKHEepAzYN6gcWel8", // GBP
    features: [
      "~550 minutes of audio transcription",
      "~60 million words of text-to-speech",
      "~80 document pages processing",
      "~50 images scanned for text (OCR)",
    ],
  },
  {
    name: "Business",
    credits: 20000,
    price: 20,
    priceId: "price_1Qo1P4DPKHEepAzYukfC0Dbh", // USD
    gbpPriceId: "price_1Qo2XgDPKHEepAzYPNDGKATB", // GBP
    features: [
      "~1,100 minutes of audio transcription",
      "~120 million words of text-to-speech",
      "~160 document pages processing",
      "~100 images scanned for text (OCR)",
    ],
  },
  {
    name: "Enterprise",
    credits: 50000,
    price: 50,
    priceId: "price_1Qo1QADPKHEepAzYNs4Re7ey", // USD
    gbpPriceId: "price_1Qo2Y1DPKHEepAzYXMqFLQsD", // GBP
    features: [
      "~2,750 minutes of audio transcription",
      "~300 million words of text-to-speech",
      "~400 document pages processing",
      "~250 images scanned for text (OCR)",
    ],
  },
  {
    name: "Ultimate",
    credits: 100000,
    price: 100,
    priceId: "price_1Qo1QUDPKHEepAzYsSlxW8hr", // USD
    gbpPriceId: "price_1Qo2YMDPKHEepAzY5X2VzMJV", // GBP
    features: [
      "~5,500 minutes of audio transcription",
      "~600 million words of text-to-speech",
      "~800 document pages processing",
      "~500 images scanned for text (OCR)",
    ],
  },
];

function PricingPageContent() {
  const { user, refreshCredits } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    isOpen: boolean;
    status: "success" | "error" | "loading";
    message: string;
    credits?: number;
  }>({
    isOpen: false,
    status: "success",
    message: "",
  });

  const headerRef = useRef(null);
  const freeCardRef = useRef(null);
  const packagesRef = useRef(null);
  const guideRef = useRef(null);

  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.2 });
  const isFreeCardInView = useInView(freeCardRef, { once: true, amount: 0.2 });
  const arePackagesInView = useInView(packagesRef, { once: true, amount: 0.2 });
  const isGuideInView = useInView(guideRef, { once: true, amount: 0.2 });

  useEffect(() => {
    if (!user || hasCheckedSession) return;

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      setHasCheckedSession(true); // Prevent multiple checks

      fetch("/api/verify-session?session_id=" + sessionId)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Refresh user credits
            refreshCredits?.();

            setPaymentStatus({
              isOpen: true,
              status: "success",
              message: "Your payment has been processed successfully.",
              credits: data.credits,
            });
          } else {
            setPaymentStatus({
              isOpen: true,
              status: "error",
              message:
                data.error || "There was an issue processing your payment.",
            });
          }

          // Remove the session_id from URL immediately after checking
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
          router.replace(newUrl);
        })
        .catch(() => {
          setPaymentStatus({
            isOpen: true,
            status: "error",
            message: "Failed to verify payment status.",
          });
          // Also clean URL on error
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
          router.replace(newUrl);
        });
    }

    // Detect user's location/currency preference
    const userLocale = navigator.language;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Set GBP for UK users (based on locale or timezone)
    if (userLocale.includes("GB") || userTimezone.includes("London")) {
      setCurrency("GBP");
    }
  }, [searchParams, user, router, refreshCredits, hasCheckedSession]);

  const handlePurchase = async (
    priceId: string,
    gbpPriceId: string,
    packageName: string
  ) => {
    try {
      if (!user) {
        window.location.href = "/sign-in";
        return;
      }

      setIsLoading(true);
      setLoadingPackage(packageName);

      const stripe = await getStripe();
      if (!stripe) {
        console.error("Failed to initialize Stripe - stripe object is null");
        setPaymentStatus({
          isOpen: true,
          status: "error",
          message: "Payment system initialization failed. Please try again.",
        });
        setIsLoading(false);
        setLoadingPackage(null);
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: currency === "GBP" ? gbpPriceId : priceId,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setPaymentStatus({
          isOpen: true,
          status: "error",
          message: data.error || "Failed to create checkout session",
        });
        setIsLoading(false);
        setLoadingPackage(null);
        return;
      }

      // Redirect to Stripe checkout
      if (DEBUG) console.log("Redirecting to checkout URL:", data.url);
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      setPaymentStatus({
        isOpen: true,
        status: "error",
        message: error.message || "An unexpected error occurred.",
      });
      setIsLoading(false);
      setLoadingPackage(null);
    }
  };

  const handleModalClose = () => {
    setPaymentStatus((prev) => ({ ...prev, isOpen: false }));
    // Ensure URL is clean when modal is closed
    const newUrl = window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    router.replace(newUrl);
  };

  return (
    <div className="w-full relative">
      <BackgroundDecorations variant="gradient-left" />
      <div className="max-w-7xl mx-auto p-4 py-12 sm:py-20">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Credit-Based Pricing
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            Pay only for what you use. Credits never expire.
          </p>
        </motion.div>

        {!user && (
          <motion.div
            ref={freeCardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={
              isFreeCardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.5 }}
          >
            <Card className="mx-auto border-primary mb-8 sm:mb-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-2xl">Start Free</span>
                  <span className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
                    New Users
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    200 Free Credits
                  </p>
                  <p className="text-muted-foreground">
                    Explore all features with no commitment
                  </p>
                </div>
                <div className="max-w-3xl mx-auto">
                  <p className="font-medium mb-3 text-center">
                    What you can do with your credits:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex flex-col items-center text-center">
                        <Headphones className="h-8 w-8 text-primary mb-2" />
                        <p className="font-medium mb-1">Audio Transcription</p>
                        <p className="text-muted-foreground">
                          Convert 11 minutes of speech to text
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex flex-col items-center text-center">
                        <MessageSquareText className="h-8 w-8 text-primary mb-2" />
                        <p className="font-medium mb-1">Text to Speech</p>
                        <p className="text-muted-foreground">
                          Convert 1,200 words into spoken audio
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex flex-col items-center text-center">
                        <FileText className="h-8 w-8 text-primary mb-2" />
                        <p className="font-medium mb-1">PDF Processing</p>
                        <p className="text-muted-foreground">
                          Process up to 40 PDF pages
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex flex-col items-center text-center">
                        <Image className="h-8 w-8 text-primary mb-2" />
                        <p className="font-medium mb-1">Image Text Scanner</p>
                        <p className="text-muted-foreground">
                          Extract text from 10 images (OCR)
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Use your credits for any service - convert audio, process
                    documents, or generate speech whenever you need
                  </p>
                </div>
                <div className="flex justify-center">
                  <AuthButton
                    href="/voice-assistant"
                    size="lg"
                    className="w-full sm:w-auto px-8"
                  >
                    Start Free Trial
                  </AuthButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          ref={packagesRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            arePackagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-16"
        >
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              animate={
                arePackagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex flex-col h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-all">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>
                    <div className="flex flex-col gap-2">
                      <span className="text-xl sm:text-2xl font-bold">
                        {pkg.name}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold">
                          {currency === "GBP" ? "£" : "$"}
                          {pkg.price}
                        </span>
                        <span className="text-muted-foreground">
                          {currency}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                  <p className="text-sm font-medium mb-4">
                    Maximum usage examples:
                  </p>
                  <ul className="space-y-2 flex-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-center mt-6">
                    <AuthButton
                      href="#"
                      onClick={() =>
                        handlePurchase(pkg.priceId, pkg.gbpPriceId, pkg.name)
                      }
                      size="lg"
                      className="w-full relative"
                      disabled={isLoading}
                    >
                      {loadingPackage === pkg.name ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        `Get ${pkg.credits.toLocaleString()} Credits`
                      )}
                    </AuthButton>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          ref={guideRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isGuideInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">
                Credit Usage Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground mb-6">
                  <p className="font-medium text-foreground mb-2">
                    How Credits Work:
                  </p>
                  <p>
                    Think of credits like a prepaid card - buy them once and
                    spend them on any service you need. You're not locked into
                    using credits for just one type of service.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Voice Assistant</h3>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>
                        Audio Transcription: 18 credits per minute (minimum 18
                        credits)
                      </li>
                      <li>
                        Text Summarization: 12 credits per 1,000 characters,
                        minimum 1 credit (includes input and output processing)
                      </li>
                      <li>
                        Text-to-Speech: 1 credit per 6,000 words (minimum 1
                        credit, even for shorter texts)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Document Converter</h3>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>
                        Image Text Scanner (OCR - Optical Character
                        Recognition): 20 credits per image
                      </li>
                      <li>
                        PDF/Text Processing: 5 credits base fee per document
                        (additional costs for summarization and TTS if
                        requested)
                      </li>
                      <li>Text-to-Speech: Same rates as Voice Assistant</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="mb-2 font-medium">Important Notes:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Each operation has a minimum charge of 1 credit</li>
                    <li>• Use your credits for any service, anytime</li>
                    <li>• Credits never expire</li>
                    <li>• No refunds on credit purchases</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <PaymentStatusModal
        isOpen={paymentStatus.isOpen}
        onClose={handleModalClose}
        status={paymentStatus.status}
        message={paymentStatus.message}
        credits={paymentStatus.credits}
      />
    </div>
  );
}

export default function PricingPage() {
  return <PricingPageContent />;
}
