import { useState } from 'react';
import { X } from 'lucide-react';
import styles from './TagInput.module.css';

function TagInput({ tags, setTags, placeholder = "輸入標籤後按 Enter" }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // 阻擋表單送出
      
      // 以 # 分割字串，並過濾掉空字串
      let rawTags = inputValue.includes('#') ? inputValue.split('#') : [inputValue];
      
      let newTagsAdded = false;
      let updatedTags = [...tags];

      rawTags.forEach(rawTag => {
        // 去除空格和分號 (包含中間的)
        const cleanedTag = rawTag.replace(/[\s;]/g, '');
        
        if (cleanedTag && !updatedTags.includes(cleanedTag)) {
          updatedTags.push(cleanedTag);
          newTagsAdded = true;
        }
      });

      if (newTagsAdded) {
        setTags(updatedTags);
      }
      setInputValue(''); // 清空輸入框
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={styles.container}>
      <div className={styles.tagsWrapper}>
        {tags.map((tag, index) => (
          <span key={index} className={styles.tagPill}>
            {tag}
            <button 
              type="button" 
              className={styles.removeBtn}
              onClick={() => removeTag(tag)}
              aria-label={`移除標籤 ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
        />
      </div>
    </div>
  );
}

export default TagInput;
