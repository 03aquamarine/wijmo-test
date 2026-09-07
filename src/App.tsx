import { useEffect, useRef } from "react";
import * as wjCore from "@mescius/wijmo";
import * as wjGrid from "@mescius/wijmo.grid";
import dayjs from "dayjs";
import "@mescius/wijmo.styles/wijmo.css";
import "./App.css";

interface Product {
	id: number;
	productName: string;
	category: string;
	unitPrice: number;
	quantity: number;
	discontinued: boolean;
	registeredDate: string;
}

const columns = [
	{
		binding: "",
		header: "선택",
		width: 50,
		isReadOnly: true,
		align: "center",
	},
	{
		binding: "id",
		header: "상품ID",
		width: 80,
		isReadOnly: true,
	},
	{
		binding: "productName",
		header: "상품명 *",
		width: 150,
	},
	{
		binding: "category",
		header: "카테고리",
		width: 120,
	},
	{
		binding: "unitPrice",
		header: "단가 (₩)",
		width: 140,
		format: "n0",
		dataType: wjCore.DataType.Number,
	},
	{
		binding: "quantity",
		header: "수량",
		width: 100,
		format: "n0",
		dataType: wjCore.DataType.Number,
	},
	{
		binding: "discontinued",
		header: "단종",
		width: 80,
		dataType: wjCore.DataType.Boolean,
	},
];

function App() {
	const gridRef = useRef<HTMLDivElement>(null);
	const gridInstanceRef = useRef<wjGrid.FlexGrid<Product>>(null);
	const collectionViewRef = useRef<wjCore.CollectionView<Product> | null>(null);
	const tooltipRef = useRef<wjCore.Tooltip | null>(null);

	const generateSampleData = (): Product[] => {
		const baseProducts: Product[] = [
			{
				id: 1,
				productName: "노트북",
				category: "IT 기기",
				unitPrice: 1500000,
				quantity: 50,
				discontinued: false,
				registeredDate: "2026-01-15",
			},
			{
				id: 2,
				productName: "모니터",
				category: "IT 기기",
				unitPrice: 350000,
				quantity: 30,
				discontinued: false,
				registeredDate: "2026-02-11",
			},
			{
				id: 3,
				productName: "키보드",
				category: "IT 액세서리",
				unitPrice: 85000,
				quantity: 120,
				discontinued: false,
				registeredDate: "2026-03-08",
			},
			{
				id: 4,
				productName: "마우스",
				category: "IT 액세서리",
				unitPrice: 45000,
				quantity: 200,
				discontinued: false,
				registeredDate: "2026-04-22",
			},
			{
				id: 5,
				productName: "프린터",
				category: "IT 기기",
				unitPrice: 450000,
				quantity: 10,
				discontinued: true,
				registeredDate: "2026-05-01",
			},
			{
				id: 6,
				productName: "메모리(16GB)",
				category: "PC 부품",
				unitPrice: 120000,
				quantity: 80,
				discontinued: false,
				registeredDate: "2026-06-19",
			},
			{
				id: 7,
				productName: "SSD(1TB)",
				category: "PC 부품",
				unitPrice: 180000,
				quantity: 60,
				discontinued: false,
				registeredDate: "2026-07-12",
			},
			{
				id: 8,
				productName: "USB 허브",
				category: "IT 액세서리",
				unitPrice: 35000,
				quantity: 150,
				discontinued: false,
				registeredDate: "2026-08-30",
			},
		];

		return Array.from({ length: 1000 }, (_, index) => {
			const template = baseProducts[Math.floor(Math.random() * baseProducts.length)];
			return {
				...template,
				id: index + 1,
				productName: `${template.productName} ${index + 1}`,
				registeredDate: dayjs(template.registeredDate)
					.add(Math.floor(Math.random() * 120) - 60, "day")
					.format("YYYY-MM-DD"),
			};
		});
	};

	const getValidationError = (
		item: Product,
		prop: string,
		parsing: boolean,
	): string | null => {
		if (parsing) {
			if (prop === "productName") {
				return "상품명은 텍스트로 입력해야 합니다.";
			}

			if (prop === "unitPrice") {
				return "단가는 숫자만 입력해야 합니다.";
			}

			if (prop === "quantity") {
				return "수량은 숫자만 입력해야 합니다.";
			}
		}

		if (prop === "productName") {
			const productName = item.productName?.trim() ?? "";
			if (!productName) {
				return "상품명은 필수 입력 항목입니다.";
			}

			const collectionView = collectionViewRef.current;
			const isDuplicate = collectionView?.items.some(
				(currentItem, index) =>
					currentItem !== item &&
					index >= 0 &&
					currentItem.productName?.trim() === productName,
			);

			if (isDuplicate) {
				return `"${productName}"은(는) 이미 등록된 상품명입니다.`;
			}
		}

		if (prop === "unitPrice") {
			if (!Number.isFinite(item.unitPrice)) {
				return "단가는 숫자여야 합니다.";
			}

			if (item.unitPrice < 1000 || item.unitPrice > 99999999) {
				return "단가는 1,000 ~ 99,999,999 범위만 유효합니다.";
			}
		}

		if (prop === "quantity") {
			if (!Number.isFinite(item.quantity)) {
				return "수량은 숫자여야 합니다.";
			}

			if (item.quantity < 0) {
				return "수량은 0 이상이어야 합니다.";
			}
		}

		if (prop === "registeredDate") {
			if (!dayjs(item.registeredDate, "YYYY-MM-DD", true).isValid()) {
				return "등록일은 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.";
			}
		}

		return null;
	};

	const openDatePicker = (
		row: number,
		col: number,
		anchor: HTMLElement,
		currentDate?: string,
	) => {
		const grid = gridInstanceRef.current;
		if (!grid) return;

		const rect = anchor.getBoundingClientRect();
		const top = rect.bottom + window.scrollY + 4;
		const left = rect.left + window.scrollX;

		const input = document.createElement("input");
		input.type = "date";
		input.style.position = "absolute";
		input.style.left = `${left}px`;
		input.style.top = `${top}px`;
		input.style.width = "1px";
		input.style.height = "1px";
		input.style.opacity = "0";
		input.style.pointerEvents = "none";
		input.style.zIndex = "9999";
		input.value = dayjs(currentDate).isValid()
			? dayjs(currentDate).format("YYYY-MM-DD")
			: dayjs().format("YYYY-MM-DD");

		const cleanup = () => {
			input.onchange = null;
			input.onblur = null;
			if (input.parentElement) {
				input.parentElement.removeChild(input);
			}
		};

		input.onchange = () => {
			if (input.value) {
				grid.setCellData(row, col, dayjs(input.value).format("YYYY-MM-DD"), true);
			}
			cleanup();
		};

		input.onblur = cleanup;
		document.body.appendChild(input);
		input.focus();

		if (typeof input.showPicker === "function") {
			input.showPicker();
		} else {
			input.click();
		}
	};

	useEffect(() => {
		if (!gridRef.current) return;

		const collectionView = new wjCore.CollectionView<Product>(
			generateSampleData(),
			{
				trackChanges: true,
			},
		);

		collectionView.getError = (
			item: Product,
			prop: string | null,
			parsing?: boolean,
		) => {
			return getValidationError(item, prop ?? "", parsing ?? false);
		};

		collectionView.collectionChanged.addHandler((_, args) => {
			if (args.action === wjCore.NotifyCollectionChangedAction.Change) {
				console.log("[CollectionView 변경]", {
					item: args.item,
					itemsEdited: collectionView.itemsEdited,
				});
			}
		});

		collectionViewRef.current = collectionView;

		const tooltip = new wjCore.Tooltip({
			isContentHtml: false,
			position: wjCore.PopupPosition.Right,
			showDelay: 0,
			hideDelay: 0,
			showAtMouse: false,
		});
		tooltipRef.current = tooltip;

		const grid = new wjGrid.FlexGrid(gridRef.current, {
			itemsSource: collectionView,
			allowResizing: wjGrid.AllowResizing.Columns,
			selectionMode: wjGrid.SelectionMode.Row,
			headersVisibility: wjGrid.HeadersVisibility.All,
			alternatingRowStep: 0,
			autoGenerateColumns: false,
			columns,
			allowSorting: true,
			beginningEdit: (s: wjGrid.FlexGrid, e: wjGrid.CellRangeEventArgs) => {
				const col = s.columns[e.col];
				if (!col || (col.binding !== "productName" && col.binding !== "registeredDate")) {
					return;
				}

				const keyboardEvent = e.data as KeyboardEvent | undefined;
				if (
					keyboardEvent?.type === "keypress" &&
					keyboardEvent.key &&
					keyboardEvent.key.length === 1
				) {
					s.setCellData(e.row, e.col, "", false);
				}
			},
		});

		grid.showErrors = true;
		grid.isReadOnly = false;

		grid.formatItem.addHandler(
			(s: wjGrid.FlexGrid, e: wjGrid.FormatItemEventArgs) => {
				if (e.panel.cellType !== wjGrid.CellType.Cell) return;

				const editRange = s.editRange;
				if (
					editRange &&
					editRange.row === e.row &&
					editRange.col === e.col
				) {
					return;
				}

				const col = s.columns[e.col];
				const cell = e.cell as HTMLElement;
				const item = s.collectionView?.items[e.row] as Product | undefined;

				cell.onmouseenter = null;
				cell.onmouseleave = null;
				cell.style.backgroundColor = "";
				cell.style.color = "";
				cell.style.fontWeight = "";
				cell.style.outline = "";
				cell.removeAttribute("title");

				if (item && col?.binding) {
					const error = getValidationError(item, col.binding, false);
					if (error) {
						cell.style.backgroundColor = "#fff1f0";
						cell.style.outline = "1px solid #d32f2f";
						cell.onmouseenter = () => {
							const tooltip = tooltipRef.current;
							if (tooltip) {
								tooltip.show(cell, error);
							}
						};
						cell.onmouseleave = () => {
							tooltipRef.current?.hide();
						};
					}
				}

				if (e.col === 0 && item) {
					if (!cell.querySelector('input[type="checkbox"]')) {
						cell.innerHTML = '<input type="checkbox" class="grid-checkbox">';
						const checkbox = cell.querySelector(
							'input[type="checkbox"]',
						) as HTMLInputElement | null;
						if (checkbox) {
							checkbox.checked = false;
							checkbox.addEventListener("change", () => {
								console.log(`Row ${e.row} checkbox: ${checkbox.checked}`);
							});
						}
					}
				}

				if (col && col.binding === "productName" && item) {
					const originalText = cell.textContent || "";

					if (!cell.querySelector(".search-btn")) {
						cell.innerHTML = `
            <div class="product-cell">
              <span>${originalText}</span>
              <button class="search-btn" title="상품 검색">🔍</button>
            </div>
          `;

						const btn = cell.querySelector(".search-btn");
						btn?.addEventListener("click", (evt) => {
							evt.stopPropagation();
							handleProductSearch(item);
						});
					}
				}

				if (col && col.binding === "registeredDate" && item) {
					const formattedDate = dayjs(item.registeredDate).isValid()
						? dayjs(item.registeredDate).format("YYYY-MM-DD")
						: "";

					if (!cell.querySelector(".calendar-btn")) {
						cell.innerHTML = `
            <div class="date-cell">
              <span>${formattedDate}</span>
              <button class="calendar-btn" title="날짜 선택">📅</button>
            </div>
          `;

						const btn = cell.querySelector(".calendar-btn");
						btn?.addEventListener("click", (evt) => {
							evt.stopPropagation();
							openDatePicker(
								e.row,
								e.col,
								evt.currentTarget as HTMLElement,
								item.registeredDate,
							);
						});
					}
				}
			},
		);

		grid.cellEditEnded.addHandler(
			(s: wjGrid.FlexGrid, e: wjGrid.CellRangeEventArgs) => {
				const col = s.columns[e.col];
				const item = s.collectionView?.items[e.row] as Product | undefined;
				const tooltip = tooltipRef.current;

				if (tooltip) {
					tooltip.hide();
				}

				if (item && col?.binding) {
					const error = getValidationError(item, col.binding, false);
					if (error) {
						const cell = s.cells.getCellElement(e.row, e.col);
						if (cell) {
							tooltip?.show(cell, error);
						}
					}
				}
			},
		);

		grid.selectionChanged.addHandler((s: wjGrid.FlexGrid) => {
			const selectedIndex = s.selection.row;
			if (selectedIndex >= 0) {
				console.log("[선택 행]", s.collectionView?.items[selectedIndex]);
			}
		});

		gridInstanceRef.current = grid;

		return () => {
			tooltip.dispose();
			grid.dispose();
			gridInstanceRef.current = null;
			collectionViewRef.current = null;
			tooltipRef.current = null;
		};
	}, []);

	const handleProductSearch = (item: Product) => {
		alert(`${item.productName} 상품 검색\n\n${JSON.stringify(item, null, 2)}`);
	};

	const handleExportToExcel = () => {
		if (!gridInstanceRef.current) return;

		const grid = gridInstanceRef.current;
		const items = grid.collectionView?.items || [];
		let csv = "";

		grid.columns.forEach((col, index) => {
			csv += `"${col.header}"`;
			if (index < grid.columns.length - 1) {
				csv += ",";
			}
		});
		csv += "\n";

		items.forEach((item: Product) => {
			grid.columns.forEach((col, index) => {
				const binding = col.binding as keyof Product | "";
				const value = binding ? item[binding] : "";
				csv += `"${value}"`;
				if (index < grid.columns.length - 1) {
					csv += ",";
				}
			});
			csv += "\n";
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", "products.csv");
		link.style.display = "none";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleAddRow = () => {
		const collectionView = collectionViewRef.current;
		if (!collectionView) return;

		const currentData = collectionView.sourceCollection as Product[];
		const maxId =
			currentData.length > 0 ? Math.max(...currentData.map((p) => p.id)) : 0;

		const newProduct: Product = {
			id: maxId + 1,
			productName: "새 상품",
			category: "미분류",
			unitPrice: 1000,
			quantity: 0,
			discontinued: false,
			registeredDate: dayjs().format("YYYY-MM-DD"),
		};

		collectionView.addNew(newProduct, true);

		console.log("[CollectionView 추가]", {
			addedItem: newProduct,
			itemsAdded: collectionView.itemsAdded,
		});
	};

	const handleDeleteRow = () => {
		const grid = gridInstanceRef.current;
		const collectionView = collectionViewRef.current;
		if (!grid || !collectionView) return;

		const index = grid.selection.row;
		if (index < 0) return;

		const item = collectionView.items[index];
		if (!item) return;

		collectionView.remove(item);

		console.log("[CollectionView 삭제]", {
			removedItem: item,
			itemsRemoved: collectionView.itemsRemoved,
		});
	};

	return (
		<div className="app-container">
			<div className="header">
				<h1>신도시 - 위즈모 그리드 테스트</h1>
				<div className="button-group">
					<button onClick={handleAddRow} className="btn btn-primary">
						➕ 행 추가
					</button>
					<button onClick={handleDeleteRow} className="btn btn-danger">
						🗑️ 행 삭제
					</button>
					<button onClick={handleExportToExcel} className="btn btn-success">
						📥 CSV 일괄 다운로드
					</button>
				</div>
			</div>

			<div className="grid-wrapper">
				<div ref={gridRef} className="wijmo-grid"></div>
			</div>
		</div>
	);
}

export default App;
