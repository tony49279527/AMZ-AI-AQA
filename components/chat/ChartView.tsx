"use client"

import React from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    PieChart,
    Pie,
    Cell,
} from "recharts"

interface ChartData {
    type: "bar" | "line" | "radar" | "pie"
    title?: string
    data: any[]
    xKey?: string
    yKeys?: string[]
}

const COLORS = ["#4f46e5", "#ec4899", "#8b5cf6", "#10b981", "#f59e0b", "#3b82f6"]

export function ChartView({ config }: { config: string }) {
    let chartConfig: ChartData

    try {
        chartConfig = JSON.parse(config)
    } catch (e) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg text-sm">
                图表数据解析错误
            </div>
        )
    }

    const { type, title, data, xKey = "name", yKeys = ["value"] } = chartConfig

    const renderChart = () => {
        switch (type) {
            case "bar":
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey={xKey}
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            tick={{ fill: "#64748b" }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            tick={{ fill: "#64748b" }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend />
                        {yKeys.map((key, idx) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                fill={COLORS[idx % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                )
            case "line":
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey={xKey}
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            tick={{ fill: "#64748b" }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            tick={{ fill: "#64748b" }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend />
                        {yKeys.map((key, idx) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                )
            case "radar":
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} />
                        <PolarRadiusAxis />
                        {yKeys.map((key, idx) => (
                            <Radar
                                key={key}
                                name={key}
                                dataKey={key}
                                stroke={COLORS[idx % COLORS.length]}
                                fill={COLORS[idx % COLORS.length]}
                                fillOpacity={0.6}
                            />
                        ))}
                        <Tooltip />
                        <Legend />
                    </RadarChart>
                )
            case "pie":
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey={yKeys[0]}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                )
            default:
                return <div>不支持的图表类型: {type}</div>
        }
    }

    return (
        <div className="my-6 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
                <h4 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                    {title}
                </h4>
            )}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    )
}
