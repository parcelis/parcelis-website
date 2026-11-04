import { handleManagedFormSubmission, readFormDataWithLimit } from "@webstudio-is/sdk/form/server";

const formId = "iAlOs6SgraNpcGwk5Dtfw";
const resourceId = "Cx2nKwv0KG-5C2oMbr_J9";
const configuration = {
  action: [{ dataSourceId: "Z1WhH-Pht_zQmvibaYMza" }],
  resourceIds: [resourceId],
};

function failure(status, message, headers = {}) {
  return Response.json(
    { success: false, status, results: [], errors: [{ message, status }] },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function handleContactForm(request, env, send = fetch) {
  if (request.method !== "POST") return failure(405, "Use POST to submit this form.", { Allow: "POST" });
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return failure(403, "Invalid form origin.");
  if (url.searchParams.get("ws--managed-form-request") !== "1") return failure(400, "Invalid form request.");
  if (!env.CONTACT_WEBHOOK_URL) return failure(503, "Contact form is not configured.");

  const destination = new URL(env.CONTACT_WEBHOOK_URL);
  if (destination.protocol !== "https:" || destination.hostname !== "cloud.activepieces.com" || !destination.pathname.startsWith("/api/v1/webhooks/")) {
    return failure(503, "Contact form destination is invalid.");
  }

  let formData;
  try {
    formData = await readFormDataWithLimit(request, 65536);
  } catch {
    return failure(400, "Invalid or oversized form submission.");
  }

  const validateDestination = (target) => {
    if (target.href !== destination.href) throw new Error("Invalid form destination.");
  };
  const resourceFetch = async (input, init) => {
    validateDestination(new URL(input instanceof Request ? input.url : String(input)));
    return send(input, { ...init, redirect: "manual" });
  };

  try {
    url.pathname = "/contact/";
    const result = await handleManagedFormSubmission({
      request,
      formData,
      url,
      system: { params: {}, origin: url.origin, pathname: url.pathname },
      configuration: (id) => id === formId ? configuration : undefined,
      getGraph: (id, values) => id === formId ? {
        resources: [{
          id: resourceId,
          name: "formSendWebhook",
          outputName: "formSendWebhook",
          dependencies: [],
          usesDefaultFormBody: true,
          bodyFormat: "json",
          createRequest: () => ({
            name: "formSendWebhook",
            url: destination.href,
            method: "post",
            searchParams: [],
            headers: [],
            bodyFormat: "json",
            body: values.formData,
          }),
        }],
        rootIds: [resourceId],
      } : undefined,
      resourceFetch,
      validateDestination,
      trustedIp: request.headers.get("CF-Connecting-IP") ?? undefined,
    });
    if (!result.success) return failure(502, "The contact service could not accept your message. Please try again.");
    return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure(400, "Invalid form submission.");
  }
}
