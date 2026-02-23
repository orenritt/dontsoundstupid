import type { IdentityLayer } from "./identity.js";
import type { ContextLayer } from "./context.js";
import type { PeerList } from "./peers.js";
import type { ImpressList } from "./impress.js";
import type { DeliveryPreferences } from "./delivery.js";
import type { CalendarData } from "./calendar.js";

export interface UserProfile {
  id: string;
  identity: IdentityLayer;
  impressList: ImpressList;
  context: ContextLayer;
  peers: PeerList;
  delivery: DeliveryPreferences;
  calendar?: CalendarData;
  relevanceKeywords: string[];
  createdAt: string;
  updatedAt: string;
}
