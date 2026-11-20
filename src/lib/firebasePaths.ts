import { collection, doc, type Firestore } from "firebase/firestore";
import { organizationId } from "./firebase";

export const organizationPath = `organizations/${organizationId}`;
export function organizationRef(db: Firestore) { return doc(db, organizationPath); }
export function collectionRef(db: Firestore, name: string) { return collection(db, `${organizationPath}/${name}`); }
export function documentRef(db: Firestore, collectionName: string, id: string) { return doc(db, `${organizationPath}/${collectionName}/${id}`); }
