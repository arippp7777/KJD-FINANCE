export type UnitStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type UnitType = "TRUCK" | "PICKUP" | "CONTAINER" | "OTHER";

export interface Unit {
  id: string;
  code: string;
  name: string;
  type: UnitType;
  plate_number: string;
  status: UnitStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateUnitInput {
  code: string;
  name: string;
  type: UnitType;
  plate_number: string;
  status?: UnitStatus;
}

export interface UpdateUnitInput extends Partial<CreateUnitInput> {
  id: string;
}
