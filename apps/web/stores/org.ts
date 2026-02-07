"use client";

import { create } from "zustand";

type Org = {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
};

type Member = {
  _id: string;
  email: string;
  name: string;
  status: string;
  designation?: string;
};

type OrgState = {
  orgs: Org[];
  currentOrg: Org | null;
  members: Member[];
  setOrgs: (orgs: Org[]) => void;
  setCurrentOrg: (org: Org | null) => void;
  setMembers: (members: Member[]) => void;
  addOrg: (org: Org) => void;
};

export const useOrgStore = create<OrgState>()((set) => ({
  orgs: [],
  currentOrg: null,
  members: [],
  setOrgs: (orgs) => set({ orgs }),
  setCurrentOrg: (org) => set({ currentOrg: org }),
  setMembers: (members) => set({ members }),
  addOrg: (org) => set((s) => ({ orgs: [...s.orgs, org] }))
}));
