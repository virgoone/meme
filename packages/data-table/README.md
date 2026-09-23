# @bunship-ai/data-table

一个功能强大、可定制的 React 数据表格组件，基于 TanStack Table 构建。

## 特性

- 🎨 完全可定制的样式
- 🌐 内置国际化支持
- 🔍 高级筛选和排序
- 📱 响应式设计
- ⚡ 高性能虚拟化
- 🎯 类型安全（TypeScript）

## 安装

```bash
bun add @bunship-ai/data-table
```

## 使用方法

### 1. 设置 Provider

在你的应用根组件中添加 `DataTableProvider`：

```tsx
import { DataTableProvider, dataTableTranslations } from '@bunship-ai/data-table';

function RootLayout({ children, locale }: { children: React.ReactNode; locale: 'en' | 'zh' }) {
  return (
    <DataTableProvider
      locale={locale}
      translations={dataTableTranslations[locale]}
    >
      {children}
    </DataTableProvider>
  );
}
```

### 2. 使用 DataTable 组件

```tsx
import { DataTable, useDataTable } from '@bunship-ai/data-table';
import { type ColumnDef } from '@tanstack/react-table';

interface User {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
];

function UsersTable({ data }: { data: User[] }) {
  const table = useDataTable({
    data,
    columns,
  });

  return <DataTable table={table} />;
}
```

## API

### DataTableProvider

```tsx
interface DataTableProviderProps {
  children: React.ReactNode;
  locale?: 'en' | 'zh';
  translations?: DataTableTranslations;
}
```

### useDataTable

完整的 hook 选项请参考 TanStack Table 文档。

## 支持的语言

- 🇺🇸 English (`en`)
- 🇨🇳 简体中文 (`zh`)

## 自定义翻译

你可以提供自定义翻译对象：

```tsx
const customTranslations = {
  noResults: "没有数据",
  loading: "加载中...",
  // ... 更多翻译
};

<DataTableProvider translations={customTranslations}>
  {children}
</DataTableProvider>
```

## 依赖

- React 19+
- @tanstack/react-table 8+
- @bunship-ai/ui (内部依赖)

## License

MIT
