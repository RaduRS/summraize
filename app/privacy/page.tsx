import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 py-8 sm:py-12">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-2xl sm:text-3xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert p-4 sm:p-6">
          <div className="space-y-6 sm:space-y-8">
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                1. Introduction
              </h2>
              <p className="text-sm sm:text-base">
                Welcome to{" "}
                <span className="font-bold">
                  summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze
                </span>
                . This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                2. Information We Collect
              </h2>
              <h3 className="text-lg sm:text-xl font-medium mb-2">
                2.1 Personal Information
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Email address (for account creation and communication)</li>
                <li>Usage data (how you interact with our service)</li>
                <li>Audio files you upload for transcription</li>
                <li>Documents you upload for processing</li>
              </ul>

              <h3 className="text-lg sm:text-xl font-medium mb-2 mt-4">
                2.2 Usage Information
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information (device type, operating system)</li>
                <li>Performance data and error reports</li>
              </ul>

              <h3 className="text-lg sm:text-xl font-medium mb-2 mt-4">
                2.3 Local Storage
              </h3>
              <p className="text-sm sm:text-base mb-4">
                We use browser local storage to enhance your experience by
                temporarily saving:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  Voice assistant session data (audio files, transcriptions, and
                  summaries)
                </li>
                <li>
                  Document converter session data (documents, text, and
                  generated audio)
                </li>
                <li>
                  User preferences and settings (including currency display
                  preferences)
                </li>
                <li>Cookie consent status</li>
              </ul>
              <p className="text-sm sm:text-base mt-4">
                This data is stored only on your device and is not transmitted
                to our servers. You can clear this data at any time by clearing
                your browser's local storage or through your browser's settings.
                Clearing local storage will reset your preferences to default
                values.
              </p>

              <h3 className="text-lg sm:text-xl font-medium mb-2 mt-4">
                2.4 Analytics and Tracking Tools
              </h3>
              <p className="text-sm sm:text-base mb-4">
                We use several analytics and tracking tools to improve our
                service and user experience:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  <span className="font-medium">Google Analytics:</span> Tracks
                  website traffic, user behavior, and demographics to improve
                  our service.
                </li>
                <li>
                  <span className="font-medium">Hotjar:</span> Records user
                  sessions, creates heatmaps, and collects feedback to
                  understand how users interact with our website.
                </li>
                <li>
                  <span className="font-medium">PostHog:</span> Tracks user
                  interactions, feature usage, and conversion funnels to improve
                  product experience.
                </li>
                <li>
                  <span className="font-medium">Vercel Analytics:</span>{" "}
                  Monitors website performance, page load times, and user
                  experience metrics.
                </li>
              </ul>

              <h3 className="text-lg sm:text-xl font-medium mb-2 mt-4">
                2.5 Cookies and Tracking Technologies
              </h3>
              <p className="text-sm sm:text-base mb-4">
                We use cookies and similar tracking technologies to track
                activity on our service and hold certain information. Cookies
                are files with a small amount of data that may include an
                anonymous unique identifier.
              </p>
              <h4 className="text-md sm:text-lg font-medium mb-2">
                Types of Cookies We Use:
              </h4>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  <span className="font-medium">Essential Cookies:</span>{" "}
                  Required for the website to function properly. These cannot be
                  disabled.
                </li>
                <li>
                  <span className="font-medium">Analytics Cookies:</span> Used
                  by Google Analytics to understand how visitors interact with
                  our website, helping us improve our services.
                </li>
                <li>
                  <span className="font-medium">Preference Cookies:</span> Used
                  to remember your preferences and settings.
                </li>
              </ul>
              <p className="text-sm sm:text-base mt-4">
                You can instruct your browser to refuse all cookies or to
                indicate when a cookie is being sent. However, if you do not
                accept cookies, you may not be able to use some portions of our
                service.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>To provide and maintain our service</li>
                <li>To process your audio and document files</li>
                <li>To manage your account and subscription</li>
                <li>To communicate with you about service updates</li>
                <li>To prevent fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                4. Data Storage and Security
              </h2>
              <p className="text-sm sm:text-base">
                We implement appropriate security measures to protect your
                information. Your files are processed securely and are not
                stored longer than necessary for the service operation.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                5. Third-Party Services
              </h2>
              <p className="text-sm sm:text-base">
                We use trusted third-party services for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Audio transcription (Deepgram)</li>
                <li>Payment processing (Stripe)</li>
                <li>
                  Analytics and User Experience Monitoring:
                  <ul className="list-disc pl-6 mt-2">
                    <li>
                      Google Analytics - Traffic analysis and user behavior
                    </li>
                    <li>Hotjar - Session recording and heatmaps</li>
                    <li>PostHog - Product analytics and feature tracking</li>
                    <li>Vercel Analytics - Performance monitoring</li>
                  </ul>
                </li>
              </ul>
              <p className="text-sm sm:text-base mt-4">
                These third-party services may collect and process your data
                according to their own privacy policies. We recommend reviewing
                their respective privacy policies for more information.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                6. Your Rights
              </h2>
              <p className="text-sm sm:text-base">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                7. Contact Us
              </h2>
              <p className="text-sm sm:text-base">
                If you have any questions about this Privacy Policy, please
                contact us at{" "}
                <span className="font-bold">
                  support@summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze.com
                </span>
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                8. Changes to This Policy
              </h2>
              <p className="text-sm sm:text-base">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last Updated" date.
              </p>
              <p className="mt-4 text-sm sm:text-base">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
