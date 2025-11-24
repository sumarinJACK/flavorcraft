"use client";

import { useState } from "react";

export default function MealPlanner() {
  const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  const meals = ["เช้า", "กลางวัน", "เย็น"];

  const [plan, setPlan] = useState(
    days.map(() => meals.map(() => ""))
  );

  const updateMeal = (dayIndex: number, mealIndex: number, value: string) => {
    const newPlan = [...plan];
    newPlan[dayIndex][mealIndex] = value;
    setPlan(newPlan);
  };

  const clearAll = () => setPlan(days.map(() => meals.map(() => "")));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        🗓️ วางแผนอาหารประจำสัปดาห์
      </h1>

      <div className="grid grid-cols-1 gap-6">
        {days.map((day, dayIndex) => (
          <div
            key={day}
            className="bg-white p-4 rounded-xl shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-3">{day}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {meals.map((meal, mealIndex) => (
                <div key={meal}>
                  <label className="text-sm text-gray-600">{meal}</label>
                  <input
                    type="text"
                    value={plan[dayIndex][mealIndex]}
                    onChange={(e) =>
                      updateMeal(dayIndex, mealIndex, e.target.value)
                    }
                    className="mt-1 w-full border border-peach rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`เมนู${meal}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={clearAll}
        className="mt-6 bg-red-500 text-white px-5 py-3 rounded-lg hover:bg-red-600"
      >
        ล้างทั้งหมด
      </button>
    </div>
  );
}