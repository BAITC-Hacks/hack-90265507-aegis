const EKT_API_URL = process.env.EKT_API_URL;
const EKT_API_USER = process.env.EKT_API_USER;
const EKT_API_PASSWORD = process.env.EKT_API_PASSWORD;

function getAuthHeader() {
  if (!EKT_API_USER || !EKT_API_PASSWORD) {
    throw new Error("EKT API credentials are missing");
  }

  const credentials = Buffer.from(
    `${EKT_API_USER}:${EKT_API_PASSWORD}`
  ).toString("base64");

  return `Basic ${credentials}`;
}

export async function getProductById(id: number) {
  if (!EKT_API_URL) {
    throw new Error("EKT_API_URL is missing");
  }

  const response = await fetch(
    `${EKT_API_URL}/products/detail?id=${id}`,
    {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `EKT API returned ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}