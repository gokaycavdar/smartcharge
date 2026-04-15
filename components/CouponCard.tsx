/**
 * Coupon Card Component
 * Displays a single coupon with redemption button
 */

import { Loader2 } from "lucide-react";

interface CouponCardProps {
	id: number;
	name: string;
	description: string;
	discountType: "percentage" | "fixed";
	discountValue: number;
	icon: string;
	coinCost: number;
	canBuy: boolean;
	onRedeem: (couponId: number) => void;
	isLoading?: boolean;
}

export function CouponCard({
	id,
	name,
	description,
	discountType,
	discountValue,
	icon,
	coinCost,
	canBuy,
	onRedeem,
	isLoading = false,
}: CouponCardProps) {
	const handleClick = () => {
		if (canBuy && !isLoading) {
			onRedeem(id);
		}
	};

	const discountDisplay =
		discountType === "percentage" ? `%${discountValue}` : `${discountValue} TL`;

	return (
		<div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
			{/* Header with icon and discount */}
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-center border-b border-gray-200">
				<div className="text-4xl mb-2">{icon}</div>
				<div className="text-2xl font-bold text-indigo-600">
					{discountDisplay} İndirim
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				<h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
				<p className="text-sm text-gray-600 mb-4">{description}</p>

				{/* Cost */}
				<div className="bg-amber-50 rounded px-3 py-2 mb-4 text-center">
					<p className="text-xs text-amber-700 mb-1">Maliyeti</p>
					<p className="text-lg font-bold text-amber-600">
						{coinCost.toLocaleString("tr-TR")} SC
					</p>
				</div>

				{/* Button */}
				<button
					onClick={handleClick}
					disabled={!canBuy || isLoading}
					className={`w-full py-2 px-4 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
						canBuy
							? "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"
							: "bg-gray-100 text-gray-400 cursor-not-allowed"
					}`}
				>
					{isLoading ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Dönüştürülüyor...
						</>
					) : canBuy ? (
						"Dönüştür"
					) : (
						"Yetersiz Bakiye"
					)}
				</button>

				{!canBuy && (
					<p className="text-xs text-red-600 mt-2 text-center">
						Bu kuponu almak için daha fazla SmartCoin'e ihtiyacınız var.
					</p>
				)}
			</div>
		</div>
	);
}
