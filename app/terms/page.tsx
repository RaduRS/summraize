import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 py-8 sm:py-12">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-2xl sm:text-3xl">
            Terms of Service
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert p-4 sm:p-6">
          <div className="space-y-6 sm:space-y-8">
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm sm:text-base">
                By accessing and using{" "}
                <span className="font-bold">
                  summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze
                </span>
                , you agree to be bound by these Terms of Service and all
                applicable laws and regulations. If you do not agree with any of
                these terms, you are prohibited from using the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                2. Description of Service
              </h2>
              <p className="text-sm sm:text-base">
                <span className="font-bold">
                  summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze
                </span>{" "}
                provides AI-powered services including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Audio transcription and analysis</li>
                <li>Document processing and conversion</li>
                <li>Text-to-speech capabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                3. User Accounts
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  You must provide accurate and complete information when
                  creating an account
                </li>
                <li>
                  You are responsible for maintaining the security of your
                  account
                </li>
                <li>
                  You must notify us immediately of any unauthorized access
                </li>
                <li>
                  We reserve the right to terminate accounts that violate these
                  terms
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                4. Credits and Payments
              </h2>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                Credits and Payments
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  Our service operates on a credit-based system. Credits must be
                  purchased in advance to use our services.
                </li>
                <li>
                  Credits are non-transferable and non-refundable. All credit
                  purchases are final.
                </li>
                <li>
                  Credits do not expire and can be used for any service we
                  offer.
                </li>
                <li>
                  The cost of services in credits is subject to change. Any
                  changes will be reflected in our pricing page.
                </li>
                <li>
                  Live transcription automatically charges 18 credits per minute
                  of audio. This charge occurs when you stop recording, and the
                  rate is fixed regardless of the actual audio length.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                5. User Content
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>You retain rights to content you upload</li>
                <li>You must have necessary rights to upload content</li>
                <li>
                  We may process but do not store your content longer than
                  necessary
                </li>
                <li>You are responsible for backing up your content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                6. Acceptable Use
              </h2>
              <p className="text-sm sm:text-base">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Use the service for illegal purposes</li>
                <li>Upload malicious content</li>
                <li>Attempt to breach security measures</li>
                <li>Resell or redistribute the service without permission</li>
                <li>Use the service to harm others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                7. Service Availability
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>
                  We strive for high availability but do not guarantee
                  uninterrupted service
                </li>
                <li>We may modify or discontinue features with notice</li>
                <li>
                  Maintenance windows will be communicated in advance when
                  possible
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-sm sm:text-base">
                <span className="font-bold">
                  summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze
                </span>{" "}
                is provided "as is" without warranties of any kind. We are not
                liable for any damages arising from the use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                9. Changes to Terms
              </h2>
              <p className="text-sm sm:text-base">
                We reserve the right to modify these terms at any time. Users
                will be notified of significant changes.
              </p>
              <p className="mt-4 text-sm sm:text-base">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                10. Contact
              </h2>
              <p className="text-sm sm:text-base">
                For questions about these Terms of Service, please contact us at{" "}
                <span className="font-bold">
                  support@summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze.com
                </span>
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
