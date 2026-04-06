import { OpenAPI } from "@/api/core/OpenAPI";
import { getPublicApiBaseUrl } from "@/lib/publicApiBase";

OpenAPI.BASE = getPublicApiBaseUrl();
