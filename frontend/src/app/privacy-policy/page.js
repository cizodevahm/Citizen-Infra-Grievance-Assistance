import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 sm:p-10 md:p-14">
        {/* Header */}
        <header className="border-b border-slate-100 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-4">
            CIGA • Citizen Infra Grievance Assistance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">
              Cizotech Software Private Limited
            </span>{" "}
            • Last updated: 22 October 2026
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-8 text-[15px] leading-relaxed text-slate-600">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              1. About this policy
            </h2>
            <p>
              Cizotech Software Private Limited operates CIGA—Citizen Infra
              Grievance Assistance. This policy explains how we collect and
              process personal information through our website, account
              services, and WhatsApp complaint service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              2. Information we collect
            </h2>
            <p className="mb-2">
              Depending on the features you use, we collect:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
              <li>Your name and email address when you create an account.</li>
              <li>
                Your WhatsApp phone number and relevant messaging identifiers
                when you contact us through WhatsApp.
              </li>
              <li>
                Complaint descriptions, photographs, voice recordings, captions,
                and locations you provide.
              </li>
              <li>
                Complaint tracking numbers, status history, timestamps, and
                related communications.
              </li>
              <li>
                Technical records needed to process requests, investigate
                errors, and operate the service.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              3. How we use your information
            </h2>
            <p className="mb-2">
              We use information to manage accounts, register and process
              complaints, identify reported locations, classify infrastructure
              issues, associate complaints with their submitters, provide
              tracking responses, and support the operation and security of
              CIGA.
            </p>
            <p>
              WhatsApp identifiers and associated messaging information are used
              as necessary to support communication with you.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              4. WhatsApp communication
            </h2>
            <p className="mb-2">
              When you contact CIGA through WhatsApp, we process your messages
              and attachments to handle your request. We associate WhatsApp
              complaints with the sender’s WhatsApp identity to support
              complaint registration and tracking.
            </p>
            <p className="mb-2">
              Meta/WhatsApp also processes information under its own applicable
              terms and privacy policy.
            </p>
            <p>
              Contacting us about a complaint does not constitute permission for
              unrelated promotional messages. You can request that we stop
              further WhatsApp communications by emailing{" "}
              <a
                href="mailto:cizotechnology@gmail.com"
                className="text-blue-600 hover:underline"
              >
                cizotechnology@gmail.com
              </a>
              .
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              5. Information you should not submit
            </h2>
            <p className="mb-2">
              Provide only information relevant to the infrastructure issue. Do
              not submit passwords, authentication codes, full payment-card
              numbers, financial-account numbers, or personal-ID numbers.
            </p>
            <p>
              Avoid including unrelated individuals’ personal details or
              sensitive documents in photographs, recordings, or complaint
              descriptions.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              6. AI-assisted processing
            </h2>
            <p className="mb-2">
              CIGA uses OpenAI services to assist with complaint classification,
              summarisation, assessment, and voice transcription.
            </p>
            <p>
              Relevant complaint text, photographs, and voice recordings may be
              sent to OpenAI for these purposes. Submitted materials may contain
              personal information you include. Automated results can contain
              errors.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              7. Service providers and disclosures
            </h2>
            <p className="mb-2">
              We use Meta/WhatsApp for messaging, Amazon Web Services for media
              storage, OpenAI for AI-assisted processing, and database and
              hosting providers to operate the application.
            </p>
            <p className="mb-2">
              Relevant information is processed by these providers to perform
              their services. Information may also be disclosed where required
              by applicable law or a valid legal request.
            </p>
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-sm">
              <strong>Notice:</strong> This policy does not represent that CIGA
              is affiliated with or endorsed by a government authority.
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              8. Complaint information and tracking
            </h2>
            <p className="mb-2">
              Complaint records may contain descriptions, locations,
              photographs, recordings, and status information. Tracking features
              can display information associated with a complaint.
            </p>
            <p className="mb-2">
              Keep complaint tracking identifiers and media links confidential.
              Do not access or distribute another person’s complaint information
              without authorisation.
            </p>
            <p>
              If you believe your information has been accessed or disclosed
              improperly, report it immediately to{" "}
              <a
                href="mailto:cizotechnology@gmail.com"
                className="text-blue-600 hover:underline"
              >
                cizotechnology@gmail.com
              </a>
              .
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              9. Location, browser storage, and maps
            </h2>
            <p className="mb-2">
              We use locations you share or select to identify where an issue
              occurred. Uploaded photographs may contain location information.
            </p>
            <p className="mb-2">
              You can manage device-location permissions through your browser.
              Denying permission may affect features that require location
              information.
            </p>
            <p>
              The website uses browser local storage to support application
              features. External map services may receive technical information,
              including your IP address and map requests, when maps load.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              10. Security and international processing
            </h2>
            <p className="mb-2">
              Backend account passwords are stored as hashes rather than plain
              text. No online service can guarantee absolute security.
            </p>
            <p>
              Our service providers may process information in countries other
              than your own, depending on the services and hosting arrangements
              used.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              11. Access, correction, and privacy concerns
            </h2>
            <p className="mb-2">
              You can email{" "}
              <a
                href="mailto:cizotechnology@gmail.com"
                className="text-blue-600 hover:underline"
              >
                cizotechnology@gmail.com
              </a>{" "}
              to request access to or correction of your personal information,
              raise a privacy concern, or withdraw consent where processing
              relies on consent.
            </p>
            <p>
              We may need to verify that a request concerns your information.
              Withdrawing consent may affect our ability to provide the related
              service.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              12. Data-deletion requests
            </h2>
            <p className="mb-2">
              To request deletion, email{" "}
              <a
                href="mailto:cizotechnology@gmail.com?subject=CIGA%20Data%20Deletion%20Request"
                className="text-blue-600 hover:underline font-medium"
              >
                cizotechnology@gmail.com
              </a>{" "}
              with the subject <strong>“CIGA Data Deletion Request.”</strong>
            </p>
            <p className="mb-2">
              Include the account email address or WhatsApp number you used and
              any relevant complaint tracking identifiers. Do not include
              passwords, authentication codes, or identity documents in your
              initial request.
            </p>
            <p className="mb-2">
              We will review your request, verify ownership where necessary, and
              explain the action that can be taken, the expected timeframe, and
              any information that must remain for a legitimate legal
              obligation.
            </p>
            <p>
              Deleting a message from WhatsApp does not automatically delete
              information already received by CIGA. Closing a complaint or
              marking it as deleted is not the same as permanently erasing its
              records. Deletion from CIGA also does not automatically remove
              copies held independently by WhatsApp or other recipients.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              13. Children’s information
            </h2>
            <p className="mb-2">
              Avoid including children’s personal information in complaint
              submissions unless necessary and legally permitted.
            </p>
            <p>
              If you believe a child’s information has been submitted
              improperly, contact{" "}
              <a
                href="mailto:cizotechnology@gmail.com"
                className="text-blue-600 hover:underline"
              >
                cizotechnology@gmail.com
              </a>{" "}
              so that we can review the matter and determine appropriate action.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              14. Human support and communication preferences
            </h2>
            <p className="mb-2">
              For assistance from our support team, questions about a complaint,
              or requests to stop communications, email{" "}
              <a
                href="mailto:cizotechnology@gmail.com"
                className="text-blue-600 hover:underline"
              >
                cizotechnology@gmail.com
              </a>
              .
            </p>
            <p>
              Include your complaint tracking identifier where relevant, but do
              not send passwords or other sensitive credentials.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              15. Policy updates
            </h2>
            <p>
              We may update this policy when our service or information-handling
              practices change. The revised policy will be published on this
              page with an updated date.
            </p>
          </section>

          {/* Section 16 / Contact */}
          <section className="pt-6 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              16. Contact us
            </h2>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-5">
              <p className="font-semibold text-slate-800">
                Cizotech Software Private Limited
              </p>
              <p className="mt-1">
                Privacy, deletion requests, and customer support:{" "}
                <a
                  href="mailto:cizotechnology@gmail.com"
                  className="text-blue-600 hover:underline font-medium"
                >
                  cizotechnology@gmail.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
