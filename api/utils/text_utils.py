import unicodedata
import re

def normalize_movie_title(title):
    """
    Normalize movie title by:
    1. Converting full-width characters (e.g. ＆, ：) to half-width (e.g. &, :)
    2. Removing leading and trailing whitespace
    3. Collapsing multiple spaces into a single space
    4. Capitalizing English letters to avoid case sensitivity issues
    """
    if not title:
        return ""
    
    # 1. NFKC normalization converts full-width to half-width
    normalized = unicodedata.normalize('NFKC', title)
    
    # 2. Collapse whitespace
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # 3. Strip whitespace
    normalized = normalized.strip()
    
    # 4. Uppercase to avoid "spider man" vs "Spider Man"
    normalized = normalized.upper()
    
    return normalized
