import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("69d35dc3003206488082")
  .setKey("standard_a9e90d51f5c259476c23a35df1ad3fc1d6e184a93903eac6e6968643df96970214a99b4f63214defd0dc85509059932f537497eb9e1028752591692fc3c92c2c8a68e039238a22390a17151ffb880f4bb3d22d478447fd8198344ab27bb47c0e8c08366dbea7ce46d049e1345d339f9b5dacf4b813b04ead0d2b8036d7ebc654");

const databases = new Databases(client);

async function listCollections() {
  try {
    const list = await databases.listCollections("any_khata_db");
    console.log("COLLECTIONS_LIST_SUCCESS");
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("COLLECTIONS_LIST_FAILED", err.message);
  }
}

listCollections();
