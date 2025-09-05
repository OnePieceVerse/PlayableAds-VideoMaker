import React from 'react';

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 不包含导航栏，只渲染子组件 */}
      {children}
    </>
  );
} 