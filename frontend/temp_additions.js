// 添加新的状态
const [isHovering, setIsHovering] = useState<string | null>(null);
const [showPopup, setShowPopup] = useState<Hotspot | null>(null);

// 添加标题唯一性验证
const isTitleUnique = (title: string, excludeId?: string) => {
  return !hotspots.some(h => 
    h.title === title && h.id !== excludeId && h.isSaved
  );
};

// 获取编辑标题
const getEditingTitle = () => {
  const currentHotspot = getSelectedHotspot();
  return currentHotspot?.isSaved ? "Edit Hotspot" : "New Hotspot";
};

// 取消编辑
const cancelEditing = () => {
  setSelectedHotspot(null);
  setIsEditing(false);
  setHotspotTitle("");
  setUrlError(null);
  setError(null);
};
