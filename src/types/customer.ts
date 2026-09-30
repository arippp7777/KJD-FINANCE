export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  contact_person: string;
  status: CustomerStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  address: string;
  contact_person: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}
