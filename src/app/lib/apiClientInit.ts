import { OpenAPI } from "@/api/core/OpenAPI";
import { tryGetPublicApiBaseUrl } from "@/lib/publicApiBase";

OpenAPI.BASE = tryGetPublicApiBaseUrl() ?? "";
