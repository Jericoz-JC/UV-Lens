import Head from "next/head";
import UVDashboard from "~/components/UVDashboard";

export default function Home() {
  return (
    <>
      <Head>
        <title>UV Lens - UV Protection Assistant</title>
        <meta name="description" content="Your personal UV protection assistant with real-time UV monitoring and personalized recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <UVDashboard />
    </>
  );
}
