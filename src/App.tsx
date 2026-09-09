import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import * as wjCore from "@mescius/wijmo";
import * as wjGridCore from "@mescius/wijmo.grid";
import * as wjGrid from "@mescius/wijmo.react.grid";
import * as wjInputCore from "@mescius/wijmo.input";
import * as wjInput from "@mescius/wijmo.react.input";
import dayjs from "dayjs";
import "@mescius/wijmo.styles/wijmo.css";
import "./App.css";
import arrowFirst from "./assets/arrow_first.png";
import arrowLast from "./assets/arrow_last.png";
import arrowLeft from "./assets/arrow_left.png";
import arrowRight from "./assets/arrow_right.png";
import plusIcon from "./assets/plus.png";
import deleteIcon from "./assets/delete.png";
import csvIcon from "./assets/xlsx.png";
import searchIcon from "./assets/search.png";
import calendarIcon from "./assets/calendar.svg";

interface Product {
	id: number;
	productName: string;
	category: string;
	unitPrice: number;
	quantity: number;
	discontinued: boolean;
	registeredDate: string;
}

interface DummyProduct {
	id: number;
	title: string;
	category: string;
	price: number;
	stock: number;
}

interface DummyProductsResponse {
	products: DummyProduct[];
	total: number;
	skip: number;
	limit: number;
}

type SortDirection = "asc" | "desc" | null;
type SortOrderKey = "AscDesc" | "DescAsc" | "AscDescNone" | "DescAscNone";

interface SelectOption<T> {
	label: string;
	value: T;
}

const DUMMY_API_URL = "https://dummyjson.com/products";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS: Array<SelectOption<number>> = [
	{ label: "20개", value: 20 },
	{ label: "50개", value: 50 },
	{ label: "100개", value: 100 },
];
const SORT_ORDER_OPTIONS: Array<SelectOption<SortOrderKey>> = [
	{ label: "AscDesc", value: "AscDesc" },
	{ label: "DescAsc", value: "DescAsc" },
	{ label: "AscDescNone", value: "AscDescNone" },
	{ label: "DescAscNone", value: "DescAscNone" },
];
const DEMO_DROPDOWN_OPTIONS: Array<SelectOption<string>> = [
	{ label: "옵션 A", value: "옵션 A" },
	{ label: "옵션 B", value: "옵션 B" },
	{ label: "옵션 C", value: "옵션 C" },
];
const PAGE_WINDOW_SIZE = 5;

const sortFieldMap: Partial<Record<keyof Product, string>> = {
	id: "id",
	productName: "title",
	category: "category",
	unitPrice: "price",
	quantity: "stock",
};

const getNextDirection = (
	current: SortDirection,
	mode: SortOrderKey,
): SortDirection => {
	switch (mode) {
		case "AscDesc":
			if (current === "asc") return "desc";
			if (current === "desc") return "asc";
			return "asc";
		case "DescAsc":
			if (current === "desc") return "asc";
			if (current === "asc") return "desc";
			return "desc";
		case "AscDescNone":
			if (current === "asc") return "desc";
			if (current === "desc") return null;
			return "asc";
		case "DescAscNone":
		default:
			if (current === "desc") return "asc";
			if (current === "asc") return null;
			return "desc";
	}
};

const mapDummyProductToGridItem = (item: DummyProduct): Product => {
	const registeredDate = dayjs("2026-01-01")
		.add(item.id % 365, "day")
		.format("YYYY-MM-DD");

	return {
		id: item.id,
		productName: item.title,
		category: item.category,
		unitPrice: Math.round(item.price * 1300),
		quantity: item.stock,
		discontinued: item.stock === 0,
		registeredDate,
	};
};

const isReadOnlyColumn = (column: wjGridCore.Column | undefined) => {
	return !column || column.isReadOnly;
};

function App() {
	const [itemsSource, setItemsSource] = useState<wjCore.CollectionView<Product> | null>(null);
	const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalCount, setTotalCount] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [sortOrderKey, setSortOrderKey] = useState<SortOrderKey>("DescAscNone");
	const [sortState, setSortState] = useState<{
		column: keyof Product | null;
		direction: SortDirection;
	}>({
		column: null,
		direction: null,
	});
	const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
	const [calendarValue, setCalendarValue] = useState<Date>(new Date());
	const [inputDateValue, setInputDateValue] = useState<Date>(new Date());
	const [rangeStartValue, setRangeStartValue] = useState<Date>(new Date());
	const [rangeEndValue, setRangeEndValue] = useState<Date>(dayjs().add(7, "day").toDate());
	const [demoDropdownValue, setDemoDropdownValue] = useState<string>(DEMO_DROPDOWN_OPTIONS[0].value);
	const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);

	const gridInstanceRef = useRef<wjGridCore.FlexGrid | null>(null);
	const popupInstanceRef = useRef<wjInputCore.Popup | null>(null);
	const collectionViewRef = useRef<wjCore.CollectionView<Product> | null>(null);
	const tooltipRef = useRef<wjCore.Tooltip | null>(null);
	const gridKeyDownListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);
	const requestTokenRef = useRef<number>(0);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(totalCount / pageSize));
	}, [totalCount, pageSize]);

	const visiblePages = useMemo(() => {
		const buttonCount = Math.min(PAGE_WINDOW_SIZE, totalPages);
		const half = Math.floor(buttonCount / 2);
		let start = currentPage - half;
		let end = currentPage + half;

		if (start < 1) {
			end += 1 - start;
			start = 1;
		}

		if (end > totalPages) {
			start -= end - totalPages;
			end = totalPages;
		}

		start = Math.max(1, start);

		const pages: number[] = [];
		for (let page = start; page <= end; page += 1) {
			pages.push(page);
		}
		return pages;
	}, [currentPage, totalPages]);

	const categoryDataMap = useMemo(() => {
		if (categoryOptions.length === 0) {
			return null;
		}
		return new wjGridCore.DataMap(categoryOptions);
	}, [categoryOptions]);

	const loadProducts = useCallback(
		async (
			page: number,
			nextPageSize: number,
			nextSortState: { column: keyof Product | null; direction: SortDirection },
		) => {
			const requestToken = ++requestTokenRef.current;
			setIsLoading(true);
			setErrorMessage("");

			try {
				const skip = (page - 1) * nextPageSize;
				const params = new URLSearchParams({
					limit: String(nextPageSize),
					skip: String(skip),
					select: "id,title,category,price,stock",
				});

				const mappedSortField = nextSortState.column
					? sortFieldMap[nextSortState.column]
					: null;

				if (mappedSortField && nextSortState.direction) {
					params.set("sortBy", mappedSortField);
					params.set("order", nextSortState.direction);
				}

				const response = await fetch(`${DUMMY_API_URL}?${params.toString()}`);
				if (!response.ok) {
					throw new Error(`데이터 조회 실패: ${response.status}`);
				}

				const data = (await response.json()) as DummyProductsResponse;

				if (requestToken !== requestTokenRef.current) {
					return;
				}

				const mappedItems = data.products.map(mapDummyProductToGridItem);
				const collectionView = new wjCore.CollectionView<Product>(mappedItems, {
					trackChanges: true,
				});

				if (nextSortState.column && nextSortState.direction) {
					collectionView.sortDescriptions.clear();
					collectionView.sortDescriptions.push(
						new wjCore.SortDescription(
							nextSortState.column,
							nextSortState.direction === "asc",
						),
					);
				}

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
				setItemsSource(collectionView);
				setTotalCount(data.total);

				if (categoryOptions.length === 0) {
					const localCategories = Array.from(
						new Set(mappedItems.map((item) => item.category).filter(Boolean)),
					);
					if (localCategories.length > 0) {
						setCategoryOptions(localCategories);
					}
				}
			} catch (error) {
				if (requestToken !== requestTokenRef.current) {
					return;
				}

				console.error(error);
				setItemsSource(new wjCore.CollectionView<Product>([], { trackChanges: true }));
				setTotalCount(0);
				setErrorMessage("상품 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
			} finally {
				if (requestToken === requestTokenRef.current) {
					setIsLoading(false);
				}
			}
		},
		[categoryOptions.length],
	);

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
				grid.setCellData(
					row,
					col,
					dayjs(input.value).format("YYYY-MM-DD"),
					true,
				);
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
		const tooltip = new wjCore.Tooltip({
			isContentHtml: false,
			position: wjCore.PopupPosition.Right,
			showDelay: 0,
			hideDelay: 0,
			showAtMouse: false,
		});
		tooltipRef.current = tooltip;

		return () => {
			tooltip.dispose();
			popupInstanceRef.current = null;
			if (gridInstanceRef.current && gridKeyDownListenerRef.current) {
				gridInstanceRef.current.hostElement.removeEventListener(
					"keydown",
					gridKeyDownListenerRef.current,
					true,
				);
			}
			gridKeyDownListenerRef.current = null;
			gridInstanceRef.current = null;
			collectionViewRef.current = null;
			tooltipRef.current = null;
			requestTokenRef.current += 1;
		};
	}, []);

	useEffect(() => {
		void loadProducts(currentPage, pageSize, sortState);
	}, [currentPage, pageSize, sortState, loadProducts]);

	useEffect(() => {
		let isMounted = true;

		const loadCategories = async () => {
			try {
				const response = await fetch(`${DUMMY_API_URL}/categories`);
				if (!response.ok) {
					throw new Error(`카테고리 조회 실패: ${response.status}`);
				}

				const categories = (await response.json()) as
					| string[]
					| Array<{ name?: string; slug?: string }>;

				if (!isMounted) return;

				const normalized = categories
					.map((category) => {
						if (typeof category === "string") {
							return category;
						}
						return category.name ?? category.slug ?? "";
					})
					.filter(Boolean);

				if (normalized.length > 0) {
					setCategoryOptions(Array.from(new Set(normalized)));
				}
			} catch (error) {
				console.warn("카테고리 조회 실패", error);
			}
		};

		void loadCategories();

		return () => {
			isMounted = false;
		};
	}, []);

	// NOTE:
	// 이전(명령형) 방식에서는 아래와 같은 구조가 필요했습니다.
	// 1) *HostRef.current: React가 만든 실제 DOM 노드를 받아 new Control(host)에 전달
	// 2) *Ref.current: 생성된 Wijmo 인스턴스를 저장해 selectedValue/show/hide/dispose 호출
	// 이번 리팩터링은 React 전용 래퍼(wjInput.*)를 직접 렌더링하는 선언형 방식이라
	// hostRef/new/dispose 보일러플레이트 없이 state + props + 이벤트로 같은 기능을 구현합니다.

	const handleProductSearch = (item: Product) => {
		alert(`${item.productName} 상품 검색\n\n${JSON.stringify(item, null, 2)}`);
	};

	const handlePopupToggle = () => {
		const popup = popupInstanceRef.current;
		if (!popup) return;

		if (popup.isVisible) {
			popup.hide();
		} else {
			popup.show(true);
		}
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
			category: categoryOptions[0] ?? "미분류",
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

	const applySortOrderValue = useCallback((selectedValue: SortOrderKey) => {
		const grid = gridInstanceRef.current;
		const sortOrderMap: Record<SortOrderKey, wjGridCore.SortOrder> = {
			AscDesc: wjGridCore.SortOrder.AscDesc,
			DescAsc: wjGridCore.SortOrder.DescAsc,
			AscDescNone: wjGridCore.SortOrder.AscDescNone,
			DescAscNone: wjGridCore.SortOrder.DescAscNone,
		};

		if (grid) {
			grid.sortOrder = sortOrderMap[selectedValue];
			grid.invalidate();
		}

		setSortOrderKey(selectedValue);
	}, []);

	const handleSortingColumn = (
		s: wjGridCore.FlexGrid,
		e: wjGridCore.CellRangeEventArgs,
	) => {
		const col = s.columns[e.col];
		const binding = col?.binding as keyof Product | "";
		if (!binding) {
			return;
		}

		e.cancel = true;

		setSortState((prev) => {
			const isSameColumn = prev.column === binding;
			const currentDirection = isSameColumn ? prev.direction : null;
			const nextDirection = getNextDirection(currentDirection, sortOrderKey);

			return {
				column: nextDirection ? binding : null,
				direction: nextDirection,
			};
		});

		setCurrentPage(1);
	};

	const applyPageSizeValue = useCallback((value: number) => {
		if (!Number.isFinite(value) || value <= 0) {
			return;
		}
		setPageSize(value);
		setCurrentPage(1);
	}, []);

	const moveToPage = (nextPage: number) => {
		if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
			return;
		}
		setCurrentPage(nextPage);
	};

	const handleGridKeyDown = (
		grid: wjGridCore.FlexGrid,
		event: KeyboardEvent,
	) => {
		if (event.key !== "Enter" || event.defaultPrevented || grid.activeEditor) {
			return;
		}

		const selection = grid.selection;
		if (!selection.isValid) {
			return;
		}

		const currentRow = selection.row;
		const currentColumn = grid.columns[selection.col];

		if (isReadOnlyColumn(currentColumn)) {
			const nextColumnIndex = selection.col + 1;
			if (nextColumnIndex >= grid.columns.length) {
				return;
			}

			grid.select(new wjGridCore.CellRange(currentRow, nextColumnIndex), true);
			grid.scrollIntoView(currentRow, nextColumnIndex, true);
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		if (grid.startEditing(true, currentRow, selection.col, true, event)) {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	const initializeGrid = (grid: wjGridCore.FlexGrid) => {
		gridInstanceRef.current = grid;
		grid.showErrors = true;
		grid.isReadOnly = false;
		grid.selectionMode = wjGridCore.SelectionMode.Cell;
		grid.keyActionTab = wjGridCore.KeyAction.Cycle;
		grid.keyActionEnter = wjGridCore.KeyAction.None;
		grid.sortOrder = wjGridCore.SortOrder[sortOrderKey];

		if (!gridKeyDownListenerRef.current) {
			gridKeyDownListenerRef.current = (event: KeyboardEvent) => {
				handleGridKeyDown(grid, event);
			};
			grid.hostElement.addEventListener(
				"keydown",
				gridKeyDownListenerRef.current,
				true,
			);
		}

		if (grid.columnFooters.rows.length === 0) {
			grid.columnFooters.rows.push(new wjGridCore.GroupRow());
			grid.bottomLeftCells.setCellData(0, 0, "합계");
		}
	};

	const handleBeginningEdit = (
		s: wjGridCore.FlexGrid,
		e: wjGridCore.CellRangeEventArgs,
	) => {
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
	};

	const handleFormatItem = (
		s: wjGridCore.FlexGrid,
		e: wjGridCore.FormatItemEventArgs,
	) => {
		if (e.panel.cellType !== wjGridCore.CellType.Cell) return;

		const editRange = s.editRange;
		if (editRange && editRange.row === e.row && editRange.col === e.col) {
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

		if (e.col === 1 && item) {
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
					<button class="search-btn" title="상품 검색">
						<img class="search-btn-icon" src="${searchIcon}" alt="검색"/>
					</button>
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
						<button class="calendar-btn" title="날짜 선택">
							<img class="calendar-btn-icon" src="${calendarIcon}" alt="날짜 선택"/>
						</button>
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
	};

	const handleCellEditEnded = (
		s: wjGridCore.FlexGrid,
		e: wjGridCore.CellRangeEventArgs,
	) => {
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
	};

	return (
		<div className="app-container">
			<div className="header">
				<h1>신도시 - 위즈모 테스트</h1>
			</div>

			<div className="content-shell">
				<section className="input-playground">
					<div className="playground-header">
						<h2>Wijmo Input Playground</h2>
						<p>ComboBox, Calendar, InputDate, InputDateRange, Popup를 한 화면에서 테스트</p>
					</div>

					<div className="playground-grid">
						<article className="input-card">
							<h3>ComboBox</h3>
							<div className="input-field">
								<span className="field-label">정렬 기준</span>
								<wjInput.ComboBox
									className="wijmo-input-host"
									itemsSource={SORT_ORDER_OPTIONS}
									displayMemberPath="label"
									selectedValuePath="value"
									selectedValue={sortOrderKey}
									isEditable={false}
									placeholder="정렬 기준"
									selectedIndexChanged={(sender: wjInputCore.ComboBox) => {
										const value = sender.selectedValue as SortOrderKey;
										if (value) {
											applySortOrderValue(value);
										}
									}}
								/>
							</div>
							<div className="input-field">
								<span className="field-label">페이지 크기</span>
								<wjInput.ComboBox
									className="wijmo-input-host"
									itemsSource={PAGE_SIZE_OPTIONS}
									displayMemberPath="label"
									selectedValuePath="value"
									selectedValue={pageSize}
									isEditable={false}
									placeholder="페이지 크기"
									selectedIndexChanged={(sender: wjInputCore.ComboBox) => {
										const value = Number(sender.selectedValue);
										if (Number.isFinite(value)) {
											applyPageSizeValue(value);
										}
									}}
								/>
							</div>
							<div className="input-field">
								<span className="field-label">드롭다운 테스트</span>
								<wjInput.ComboBox
									className="wijmo-input-host"
									itemsSource={DEMO_DROPDOWN_OPTIONS}
									displayMemberPath="label"
									selectedValuePath="value"
									selectedValue={demoDropdownValue}
									isEditable={false}
									placeholder="드롭다운 테스트"
									selectedIndexChanged={(sender: wjInputCore.ComboBox) => {
										setDemoDropdownValue(
											String(sender.selectedValue ?? DEMO_DROPDOWN_OPTIONS[0].value),
										);
									}}
								/>
							</div>
							<p className="state-note">선택값: {demoDropdownValue}</p>
						</article>

						<article className="input-card">
							<h3>Calendar</h3>
							<wjInput.Calendar
								className="wijmo-calendar-host"
								value={calendarValue}
								showHeader={true}
								selectionMode={wjInputCore.DateSelectionMode.Day}
								valueChanged={(sender: wjInputCore.Calendar) => {
									setCalendarValue(sender.value ?? new Date());
								}}
							/>
							<p className="state-note">{dayjs(calendarValue).format("YYYY-MM-DD")}</p>
						</article>

						<article className="input-card">
							<h3>InputDate</h3>
							<wjInput.InputDate
								className="wijmo-input-host"
								value={inputDateValue}
								format="yyyy-MM-dd"
								showHeader={true}
								selectionMode={wjInputCore.DateSelectionMode.Day}
								showMonthPicker={true}
								valueChanged={(sender: wjInputCore.InputDate) => {
									setInputDateValue(sender.value ?? new Date());
								}}
							/>
							<p className="state-note">{dayjs(inputDateValue).format("YYYY-MM-DD")}</p>
						</article>

						<article className="input-card">
							<h3>InputDateRange</h3>
							<wjInput.InputDateRange
								className="wijmo-input-host"
								value={rangeStartValue}
								rangeEnd={rangeEndValue}
								format="yyyy-MM-dd"
								separator=" ~ "
								showHeader={true}
								valueChanged={(sender: wjInputCore.InputDateRange) => {
									setRangeStartValue(sender.value ?? new Date());
								}}
								rangeEndChanged={(sender: wjInputCore.InputDateRange) => {
									setRangeEndValue(sender.rangeEnd ?? new Date());
								}}
							/>
							<p className="state-note">
								{dayjs(rangeStartValue).format("YYYY-MM-DD")} ~ {dayjs(rangeEndValue).format("YYYY-MM-DD")}
							</p>
						</article>

						<article className="input-card">
							<h3>Popup</h3>
							<div className="popup-actions">
								<button type="button" className="btn btn-primary" onClick={handlePopupToggle}>
									레이어 팝업 {isPopupVisible ? "닫기" : "열기"}
								</button>
								<span className="state-note">모달 레이어와 위치 표시를 함께 테스트합니다.</span>
							</div>
							<wjInput.Popup
								initialized={(popup: wjInputCore.Popup) => {
									popupInstanceRef.current = popup;
								}}
								showing={() => setIsPopupVisible(true)}
								hidden={() => setIsPopupVisible(false)}
								modal={true}
								showTrigger={wjInputCore.PopupTrigger.None}
								hideTrigger={wjInputCore.PopupTrigger.None}
								position={wjCore.PopupPosition.BelowLeft}
								isDraggable={true}
								isResizable={true}
								removeOnHide={false}
							>
								<div className="popup-layer">
									<div className="popup-layer-header">레이어 팝업</div>
									<div className="popup-layer-body">
										<p>Popup 컴포넌트 테스트 영역입니다.</p>
										<p>현재 날짜: {dayjs(inputDateValue).format("YYYY-MM-DD")}</p>
										<button type="button" className="btn-page" onClick={handlePopupToggle}>
											닫기
										</button>
									</div>
								</div>
							</wjInput.Popup>
						</article>
					</div>
				</section>

				<div className="grid-wrapper">
					<div className="grid-toolbar">
						<div className="grid-action-buttons" aria-label="그리드 동작 버튼">
							<button onClick={handleAddRow} className="grid-action-btn grid-action-btn-add" type="button">
								<img className="grid-action-btn-icon" src={plusIcon} alt="" aria-hidden="true" />
								<span>행 추가</span>
							</button>
							<button onClick={handleDeleteRow} className="grid-action-btn grid-action-btn-delete" type="button">
								<img className="grid-action-btn-icon" src={deleteIcon} alt="" aria-hidden="true" />
								<span>행 삭제</span>
							</button>
							<button onClick={handleExportToExcel} className="grid-action-btn grid-action-btn-csv" type="button">
								<img className="grid-action-btn-icon" src={csvIcon} alt="" aria-hidden="true" />
								<span>엑셀 다운로드</span>
							</button>
						</div>
						<div className="toolbar-row toolbar-status">
							<span>총 {totalCount.toLocaleString()}건</span>
							{isLoading ? <span>데이터 로딩 중...</span> : null}
							{errorMessage ? <span className="error-message">{errorMessage}</span> : null}
						</div>
					</div>

					<wjGrid.FlexGrid
						className="wijmo-grid"
						itemsSource={itemsSource ?? undefined}
						autoGenerateColumns={false}
						allowResizing={wjGridCore.AllowResizing.Columns}
						selectionMode={wjGridCore.SelectionMode.Row}
						headersVisibility={wjGridCore.HeadersVisibility.Column}
						alternatingRowStep={0}
						allowSorting={true}
						deferResizing={true}
						initialized={initializeGrid}
						sortingColumn={handleSortingColumn}
						beginningEdit={handleBeginningEdit}
						formatItem={handleFormatItem}
						cellEditEnded={handleCellEditEnded}
					>
						<wjGrid.FlexGridColumn
							binding="id"
							header="No."
							width={50}
							align="center"
							isReadOnly={true}
						/>
						<wjGrid.FlexGridColumn
							binding=""
							header=""
							width={50}
							align="center"
						/>
						<wjGrid.FlexGridColumn binding="productName" header="상품명" width={300} />
						<wjGrid.FlexGridColumn
							binding="category"
							header="카테고리"
							width={150}
							align="center"
							dataMap={categoryDataMap ?? undefined}
						/>
						<wjGrid.FlexGridColumn
							binding="unitPrice"
							header="단가 (₩)"
							width={120}
							format="n0"
							dataType={wjCore.DataType.Number}
							aggregate="Sum"
						/>
						<wjGrid.FlexGridColumn
							binding="quantity"
							header="수량"
							width={100}
							format="n0"
							dataType={wjCore.DataType.Number}
							aggregate="Sum"
						/>
					</wjGrid.FlexGrid>

					<div className="pagination-bar">
						<div className="pagination-controls">
							<button
								type="button"
								className="btn-page"
								onClick={() => moveToPage(1)}
								disabled={currentPage === 1 || isLoading}
								aria-label="첫 페이지"
							>
								<img className="page-arrow-two-icon" src={arrowFirst} alt="" aria-hidden="true" />
							</button>
							<button
								type="button"
								className="btn-page"
								onClick={() => moveToPage(currentPage - 1)}
								disabled={currentPage === 1 || isLoading}
								aria-label="이전 페이지"
							>
								<img className="page-arrow-one-icon" src={arrowLeft} alt="" aria-hidden="true" />
							</button>
							<div className="page-number-list" aria-label="페이지 번호 목록">
								{visiblePages.map((page) => (
									<button
										key={page}
										type="button"
										className={`btn-page btn-page-number ${
											page === currentPage ? "active" : ""
										}`}
										onClick={() => moveToPage(page)}
										disabled={isLoading}
										aria-current={page === currentPage ? "page" : undefined}
									>
										{page}
									</button>
								))}
							</div>
							<button
								type="button"
								className="btn-page"
								onClick={() => moveToPage(currentPage + 1)}
								disabled={currentPage >= totalPages || isLoading}
								aria-label="다음 페이지"
							>
								<img className="page-arrow-one-icon" src={arrowRight} alt="" aria-hidden="true" />
							</button>
							<button
								type="button"
								className="btn-page"
								onClick={() => moveToPage(totalPages)}
								disabled={currentPage >= totalPages || isLoading}
								aria-label="마지막 페이지"
							>
								<img className="page-arrow-two-icon" src={arrowLast} alt="" aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
