import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";
import { OfferSelectionProvider } from "@/context/OfferSelectionContext";
import CommercialAccessGate from "@/components/CommercialAccessGate/CommercialAccessGate";
import { IS_COMMERCIAL_SITE } from "@/config/site";
import Head from "next/head";

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }) {
    const page = <Component {...pageProps} />;

    return (
        <>
            {IS_COMMERCIAL_SITE && (
                <Head>
                    <title>Marbok Komercijala</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Head>
            )}
            <StoreProvider>
                <OfferSelectionProvider>
                    <QueryClientProvider client={queryClient}>
                        <Hydrate state={pageProps.dehydratedState}>
                            <div id="modal" className="modal"></div>
                            {IS_COMMERCIAL_SITE ? (
                                <CommercialAccessGate>
                                    {page}
                                </CommercialAccessGate>
                            ) : (
                                page
                            )}
                        </Hydrate>
                    </QueryClientProvider>
                </OfferSelectionProvider>
            </StoreProvider>
        </>
    );
}
