import type { IdentityLayer } from "./identity";
import type { ContextLayer } from "./context";
import type { PeerList } from "./peers";
import type { ImpressList } from "./impress";
import type { DeliveryPreferences } from "./delivery";
import type { CalendarData } from "./calendar";

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
