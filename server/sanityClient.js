import { createClient } from "next-sanity";
import clientConfig from "@/sanity/config/client-config";
export function sanityClient() {
    if (!process.env.SANITY_API_TOKEN) throw new Error("SANITY_API_TOKEN is required on the server.");
    return createClient({ ...clientConfig, token: process.env.SANITY_API_TOKEN, useCdn: false });
}
