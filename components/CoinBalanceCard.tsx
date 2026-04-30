/**
 * Coupon Balance Card Component
 * Displays user's current SmartCoin balance in a prominent card
 */

import { Coins } from "lucide-react";

interface CoinBalanceCardProps {
  coins: number;
  isLoading?: boolean;
}

export function CoinBalanceCard({ coins, isLoading = false }: CoinBalanceCardProps) {
	return (
		<div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium opacity-90">SmartCoin Bakiyesi</p>
					<div className="flex items-baseline gap-2 mt-2">
						<span className="text-4xl font-bold">
							{isLoading ? "..." : coins.toLocaleString("tr-TR")}
						</span>
						<span className="text-xl opacity-75">SC</span>
					</div>
				</div>
				<div className="bg-white bg-opacity-20 rounded-full p-4">
					<Coins className="w-10 h-10" strokeWidth={1.5} />
				</div>
			</div>
			<p className="text-xs opacity-75 mt-4">
				Kupon dönüştürme için mevcut bakiye
			</p>
		</div>
	);
}
