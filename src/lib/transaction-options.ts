export const TRANSACTION_TYPES = [
    { value: "all", label: "Todos" }, // For filters
    { value: "income", label: "Ingresos" },
    { value: "expense", label: "Gastos" },
] as const

export const TRANSACTION_TYPES_FORM = [
    { value: "expense", label: "Gasto" },
    { value: "income", label: "Ingreso" },
] as const

export const SORT_OPTIONS = [
    { value: "date_desc", label: "Fecha (más recientes)" },
    { value: "date_asc", label: "Fecha (más antiguas)" },
    { value: "amount_desc", label: "Cantidad (mayor a menor)" },
    { value: "amount_asc", label: "Cantidad (menor a mayor)" },
] as const

export const SCOPE_OPTIONS = [
    { value: "shared", label: "Compartido (Hogar)" },
    { value: "member", label: "Privado (Mío)" },
] as const
