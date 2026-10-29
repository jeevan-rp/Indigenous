import re
from typing import Tuple, Optional

def normalize_part_number(part_number: str) -> str:
    """
    Normalizes part number safely:
    - Strips leading and trailing whitespace
    - Uppercases for case-insensitive matching
    - Preserves meaningful suffixes (e.g. -3.3, RET6, WROOM-32E, SOT-223, I/P)
    - Removes internal spaces around hyphens/slashes
    - Does NOT strip package, voltage, or temperature variant suffixes!
    """
    if not part_number:
        return ""
    
    pn = part_number.strip().upper()
    
    # Normalize multiple whitespace characters
    pn = re.sub(r'\s+', ' ', pn)
    
    # Clean whitespace around common delimiter symbols like '-' or '/'
    pn = re.sub(r'\s*([-\/])\s*', r'\1', pn)
    
    return pn


def is_exact_part_match(query_pn: str, target_pn: str) -> bool:
    """
    Tests if query_pn is an exact match for target_pn.
    Preserves exact variant suffixes:
    e.g. STM32F401RET6 vs STM32F401RET6 -> True
    STM32F401RET6 vs STM32F401RCT6 -> False (different flash/pinout variant)
    LM1117IMP-3.3 vs LM1117IMP-3.3 -> True
    LM1117IMP-3.3 vs LM1117IMP-5.0 -> False (different voltage variant)
    """
    norm_query = normalize_part_number(query_pn)
    norm_target = normalize_part_number(target_pn)
    
    if not norm_query or not norm_target:
        return False
        
    return norm_query == norm_target


def classify_part_match(query_pn: str, target_pn: str) -> Tuple[str, bool]:
    """
    Returns (match_type, is_exact):
    - ('EXACT_MATCH', True)
    - ('POTENTIAL_ALTERNATIVE', False)
    - ('NO_MATCH', False)
    """
    if is_exact_part_match(query_pn, target_pn):
        return ("EXACT_MATCH", True)
        
    norm_query = normalize_part_number(query_pn)
    norm_target = normalize_part_number(target_pn)
    
    # Check if they share base family prefix (at least 6 chars)
    # e.g. STM32F401 vs STM32F401RET6
    common_prefix_len = 0
    min_len = min(len(norm_query), len(norm_target))
    for i in range(min_len):
        if norm_query[i] == norm_target[i]:
            common_prefix_len += 1
        else:
            break
            
    if common_prefix_len >= 6 and (norm_query != norm_target):
        # Different variant/suffix - flagged as potential alternative, NOT exact match!
        return ("POTENTIAL_ALTERNATIVE", False)
        
    return ("NO_MATCH", False)
