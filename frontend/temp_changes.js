// 修改标题显示逻辑
const getEditingTitle = () => {
  const currentHotspot = getSelectedHotspot();
  return currentHotspot?.isSaved ? "Edit Hotspot" : "New Hotspot";
};

// 添加取消功能
const cancelEditing = () => {
  setSelectedHotspot(null);
  setIsEditing(false);
  setHotspotTitle("");
  setUrlError(null);
};

// 添加标题唯一性验证
const isTitleUnique = (title: string, excludeId?: string) => {
  return !hotspots.some(h => 
    h.title === title && h.id !== excludeId && h.isSaved
  );
};

// 修改保存逻辑
const saveHotspot = () => {
  if (!selectedHotspot) return;

  const currentHotspot = getSelectedHotspot();
  
  // 验证标题唯一性
  if (hotspotTitle.trim() && !isTitleUnique(hotspotTitle.trim(), selectedHotspot)) {
    setError("Hotspot Title must be unique");
    return;
  }
  
  // 验证URL
  if (currentHotspot?.action === "url") {
    if (!currentHotspot.url.trim()) {
      setUrlError("URL is required when action type is URL");
      return;
    }
    if (!isValidUrl(currentHotspot.url)) {
      setUrlError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }
  }

  setUrlError(null);
  setError(null);

  const updates: Partial<Hotspot> = {
    isSaved: true,
    title: hotspotTitle || `Hotspot ${hotspotCounter - 1}`
  };

  updateHotspot(selectedHotspot, updates);
  setSelectedHotspot(null);
  setIsEditing(false);
  setHotspotTitle("");
};
