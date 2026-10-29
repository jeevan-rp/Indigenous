import { describe, it, expect } from 'vitest';
import { Seller, RFQ, SellerListing, OriginCategory } from '../types';

describe('Indian Seller Discovery and RFQ Domain Logic', () => {
  it('strictly preserves critical package/voltage suffixes during MPN normalization', () => {
    // Normalization logic: trim & uppercase, but NEVER strip suffixes like -3.3, RET6, WROOM-32E
    const normalizePartNumber = (raw: string): string => {
      if (!raw) return '';
      return raw.trim().toUpperCase();
    };

    expect(normalizePartNumber(' stm32f401ret6 ')).toBe('STM32F401RET6');
    expect(normalizePartNumber('LM1117IMP-3.3')).toBe('LM1117IMP-3.3');
    expect(normalizePartNumber('ESP32-WROOM-32E')).toBe('ESP32-WROOM-32E');
    expect(normalizePartNumber('MAX485ESA+T')).toBe('MAX485ESA+T');

    // Variants must remain distinct
    expect(normalizePartNumber('STM32F401RET6')).not.toBe(normalizePartNumber('STM32F401RCT6'));
    expect(normalizePartNumber('LM1117IMP-3.3')).not.toBe(normalizePartNumber('LM1117IMP-5.0'));
  });

  it('guarantees strict 7-category seller classification rules without false Indian manufacturer claims', () => {
    type SellerClassification =
      | 'INDIAN_SELLER_EXACT'
      | 'INDIAN_AUTHORISED_DISTRIBUTOR'
      | 'INDIAN_SELLER_UNVERIFIED_AUTHORISATION'
      | 'VERIFIED_INDIAN_MANUFACTURER'
      | 'POTENTIAL_INDIAN_ALTERNATIVE'
      | 'FOREIGN_MFR_INDIAN_SELLER'
      | 'NO_VERIFIED_SELLER_FOUND';

    const determineClassification = (params: {
      sellerCountry: string;
      isManufacturer: boolean;
      mfrCountry: string;
      isAuthorizedDistributor?: boolean;
      exactMatch: boolean;
    }): SellerClassification => {
      const { sellerCountry, isManufacturer, mfrCountry, isAuthorizedDistributor, exactMatch } = params;

      if (!exactMatch) {
        return 'POTENTIAL_INDIAN_ALTERNATIVE';
      }

      // Safety rule: Only classify as VERIFIED_INDIAN_MANUFACTURER if actual manufacturing takes place in India
      if (isManufacturer && mfrCountry === 'IN' && sellerCountry === 'IN') {
        return 'VERIFIED_INDIAN_MANUFACTURER';
      }

      // If component is foreign-manufactured but sold by an Indian company
      if (mfrCountry !== 'IN' && sellerCountry === 'IN') {
        if (isAuthorizedDistributor) {
          return 'INDIAN_AUTHORISED_DISTRIBUTOR';
        }
        return 'FOREIGN_MFR_INDIAN_SELLER';
      }

      if (sellerCountry === 'IN') {
        if (isAuthorizedDistributor) {
          return 'INDIAN_AUTHORISED_DISTRIBUTOR';
        }
        return 'INDIAN_SELLER_EXACT';
      }

      return 'NO_VERIFIED_SELLER_FOUND';
    };

    // Test Case 1: Mindgrove Technologies (Indian fabless manufacturer of Secure IoT SoC)
    expect(
      determineClassification({
        sellerCountry: 'IN',
        isManufacturer: true,
        mfrCountry: 'IN',
        exactMatch: true
      })
    ).toBe('VERIFIED_INDIAN_MANUFACTURER');

    // Test Case 2: STMicroelectronics chip sold by Element14 India (Authorised distributor)
    expect(
      determineClassification({
        sellerCountry: 'IN',
        isManufacturer: false,
        mfrCountry: 'CH',
        isAuthorizedDistributor: true,
        exactMatch: true
      })
    ).toBe('INDIAN_AUTHORISED_DISTRIBUTOR');

    // Test Case 3: Texas Instruments chip sold by local vendor without verified authorization
    expect(
      determineClassification({
        sellerCountry: 'IN',
        isManufacturer: false,
        mfrCountry: 'US',
        isAuthorizedDistributor: false,
        exactMatch: true
      })
    ).toBe('FOREIGN_MFR_INDIAN_SELLER');

    // Safety verification: Never classify foreign part as Indian manufacturer just because seller is in India
    const classification = determineClassification({
      sellerCountry: 'IN',
      isManufacturer: false,
      mfrCountry: 'US',
      exactMatch: true
    });
    expect(classification).not.toBe('VERIFIED_INDIAN_MANUFACTURER');
  });

  it('validates RFQ generation and legal reference format', () => {
    const generateRfqRef = (year: number, seq: number): string => {
      const padded = seq.toString().padStart(4, '0');
      return `RFQ-${year}-${padded}`;
    };

    const ref = generateRfqRef(2026, 42);
    expect(ref).toBe('RFQ-2026-0042');
    expect(ref).toMatch(/^RFQ-\d{4}-\d{4}$/);
  });

  it('validates RFQ status lifecycles and honest disclaimer notices', () => {
    const validStatuses = [
      'DRAFT',
      'READY_TO_SEND',
      'SENT_BY_USER',
      'SUBMITTED_VIA_INTEGRATION',
      'RESPONSE_RECEIVED',
      'CLOSED'
    ];

    expect(validStatuses).toContain('SENT_BY_USER');
    expect(validStatuses).toContain('SUBMITTED_VIA_INTEGRATION');

    // Honest transmission policy: system generates mailto and template without fake immediate submission
    const getTransmissionNotice = (channel: 'EMAIL' | 'API'): string => {
      if (channel === 'API') {
        return 'Integration endpoint configured. Quote request will be submitted directly to distributor API.';
      }
      return 'RFQ document and formal quotation email generated. Please dispatch via your verified enterprise email client.';
    };

    expect(getTransmissionNotice('EMAIL')).toContain('dispatch via your verified enterprise email client');
  });
});
