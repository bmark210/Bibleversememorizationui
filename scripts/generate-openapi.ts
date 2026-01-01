import fs from "fs";
import doc from "../src/swagger/doc";

fs.writeFileSync("openapi.json", JSON.stringify(doc, null, 2));
