import type { Industry } from "@prisma/client";
import type { AppSectionId } from "@/lib/permissions";

/**
 * A capability is something the app can do that only some trades need.
 * Features check capabilities, never industry names — so adding a trade
 * never means editing a feature.
 */
export type Capability =
  // Food service
  | "rush_pos"
  | "kitchen_display"
  | "combo_meals"
  | "voice_orders"
  | "plate_builder"
  // Regulated stock
  | "batch_tracking"
  | "expiry_alerts"
  | "prescription_log"
  | "controlled_register"
  // Variant-heavy stock
  | "variant_matrix"
  | "season_tracking"
  // Serialised stock
  | "serial_tracking"
  | "warranty_tracking";

/**
 * One extra product field a trade needs. Declared once and used twice — to
 * build the validator and to render the form — so the two can't drift.
 */
export type AttributeField =
  | {
      readonly name: string;
      readonly label: string;
      readonly type: "text";
      readonly required?: boolean;
      readonly placeholder?: string;
      readonly maxLength?: number;
      readonly pattern?: RegExp;
      readonly patternMessage?: string;
    }
  | {
      readonly name: string;
      readonly label: string;
      readonly type: "number";
      readonly required?: boolean;
      readonly placeholder?: string;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly name: string;
      readonly label: string;
      readonly type: "boolean";
      readonly required?: boolean;
    }
  | {
      readonly name: string;
      readonly label: string;
      readonly type: "select";
      readonly required?: boolean;
      readonly options: readonly { readonly value: string; readonly label: string }[];
    };

export interface IndustryPack {
  /** Every Industry enum value this pack serves. */
  readonly industries: readonly Industry[];
  /** What this trade can do. */
  readonly capabilities: readonly Capability[];
  /**
   * Sections hidden for this trade even when the member's role allows them.
   * Role permissions still apply on top — this only ever removes.
   */
  readonly hiddenSections?: readonly AppSectionId[];
  /** Category chips offered in POS and inventory. */
  readonly categoryPresets: readonly string[];
  /** What stock is called here, for UI copy. */
  readonly productNoun: { readonly singular: string; readonly plural: string };
  /** Which checkout surface to open by default. */
  readonly posMode: "standard" | "rush" | "scan_first";
  /**
   * Extra product fields for this trade, stored in `Product.attributes`.
   * Adding one is a config edit here — no migration.
   */
  readonly productAttributes: readonly AttributeField[];
}
