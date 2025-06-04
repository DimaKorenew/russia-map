import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { Tooltip } from 'react-tooltip';
import russiaGeoData from '../data/russia-geo.json';
import recipesData from '../data/recipes.json';

const MapContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #fff;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
`;

const MapWrapper = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
  background: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  -webkit-touch-callout: none;
  padding: 0;
  overflow: visible;
  z-index: 1;

  @media (max-width: 768px) {
    height: 60vh;
    min-height: 400px;
    max-height: 500px;
    overflow: hidden;
  }

  @media (max-width: 480px) {
    height: 50vh;
    min-height: 350px;
    max-height: 400px;
  }
`;

const ZoomControls = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: none;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const ZoomButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  color: #1e293b;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  user-select: none;

  &:hover {
    background: #f8fafc;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
    background: #e2e8f0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResetZoomButton = styled(ZoomButton)`
  width: auto;
  height: 36px;
  border-radius: 18px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
`;

const StyledTooltip = styled(Tooltip)`
  && {
    background-color: #1e293b !important;
    color: white !important;
    font-size: 16px !important;
    padding: 8px 16px !important;
    border-radius: 8px !important;
    z-index: 1000 !important;
    opacity: 1 !important;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    pointer-events: none !important;
  }
`;

const RegionLabel = styled.div`
  position: absolute;
  pointer-events: none;
  background-color: rgba(30, 41, 59, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  transform: translate(-50%, -50%);
  z-index: 1000;
  transition: opacity 0.2s ease;
`;

const PopupContainer = styled.div`
  position: absolute;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  max-width: 250px;
  z-index: 1000;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 40px));
  
  &:after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid white;
  }
`;

const PopupTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
`;

const PopupRecipeList = styled.div`
  margin-top: 8px;
`;

const PopupRecipeItem = styled.div`
  padding: 6px 8px;
  font-size: 13px;
  color: #475569;
  border-radius: 4px;
  transition: background 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }
`;

const RecipeList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const RecipeItem = styled.li`
  padding: 6px 0;
  color: #475569;
  font-size: 14px;
  
  &:not(:last-child) {
    border-bottom: 1px solid #e2e8f0;
  }
`;

interface Recipe {
  id: string;
  name: string;
  url: string;
}

interface RegionRecipes {
  recipes: Recipe[];
}

interface RecipesData {
  regions: {
    [key: string]: RegionRecipes;
  };
}

const RecipeLink = styled.a`
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  transition: all 0.2s ease;

  &:hover {
    color: #2563eb;
  }
`;

const RegionRecipeItem = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  margin-bottom: 8px;
  transition: all 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }
`;

interface RegionInfo {
  name: string;
  position: [number, number];
  recipes: Recipe[];
}

const regionTranslations: { [key: string]: string } = {
  "Adygey": "Адыгея",
  "Altay": "Алтай",
  "Amur": "Амурская область",
  "Arkhangel'sk": "Архангельская область",
  "Astrakhan'": "Астраханская область",
  "Bashkortostan": "Башкортостан",
  "Belgorod": "Белгородская область",
  "Bryansk": "Брянская область",
  "Buryat": "Бурятия",
  "Chechnya": "Чечня",
  "Chelyabinsk": "Челябинская область",
  "Chukot": "Чукотский АО",
  "Chukchi Autonomous Okrug": "Чукотский АО",
  "Chuvash": "Чувашия",
  "City of St. Petersburg": "Санкт-Петербург",
  "Crimea": "Крым",
  "Dagestan": "Дагестан",
  "Gorno-Altay": "Республика Алтай",
  "Ingush": "Ингушетия",
  "Irkutsk": "Иркутская область",
  "Ivanovo": "Ивановская область",
  "Kabardin-Balkar": "Кабардино-Балкария",
  "Kaliningrad": "Калининградская область",
  "Kalmyk": "Калмыкия",
  "Kaluga": "Калужская область",
  "Kamchatka": "Камчатский край",
  "Karachay-Cherkess": "Карачаево-Черкесия",
  "Karelia": "Карелия",
  "Kemerovo": "Кемеровская область",
  "Khabarovsk": "Хабаровский край",
  "Khakass": "Хакасия",
  "Khanty-Mansiy": "Ханты-Мансийский АО",
  "Kirov": "Кировская область",
  "Komi": "Коми",
  "Kostroma": "Костромская область",
  "Krasnodar": "Краснодарский край",
  "Krasnoyarsk": "Красноярский край",
  "Kurgan": "Курганская область",
  "Kursk": "Курская область",
  "Leningrad": "Ленинградская область",
  "Lipetsk": "Липецкая область",
  "Magadan": "Магаданская область",
  "Maga Buryatdan": "Магаданская область",
  "Mariy-El": "Марий Эл",
  "Mordovia": "Мордовия",
  "Moscow City": "Москва",
  "Moskva": "Московская область",
  "Murmansk": "Мурманская область",
  "Nenets": "Ненецкий АО",
  "Nizhegorod": "Нижегородская область",
  "North Ossetia": "Северная Осетия",
  "Novgorod": "Новгородская область",
  "Novosibirsk": "Новосибирская область",
  "Omsk": "Омская область",
  "Orel": "Орловская область",
  "Orenburg": "Оренбургская область",
  "Penza": "Пензенская область",
  "Perm'": "Пермский край",
  "Primor'ye": "Приморский край",
  "Pskov": "Псковская область",
  "Rostov": "Ростовская область",
  "Ryazan'": "Рязанская область",
  "Sakha": "Якутия",
  "Sakha (Yakutia)": "Якутия",
  "Sakhalin": "Сахалинская область",
  "Samara": "Самарская область",
  "Saratov": "Саратовская область",
  "Sevastopol'": "Севастополь",
  "Smolensk": "Смоленская область",
  "Stavropol'": "Ставропольский край",
  "Sverdlovsk": "Свердловская область",
  "Tambov": "Тамбовская область",
  "Tatarstan": "Татарстан",
  "Tomsk": "Томская область",
  "Tula": "Тульская область",
  "Tuva": "Тыва",
  "Tver'": "Тверская область",
  "Tyumen'": "Тюменская область",
  "Udmurt": "Удмуртия",
  "Ul'yanovsk": "Ульяновская область",
  "Vladimir": "Владимирская область",
  "Volgograd": "Волгоградская область",
  "Vologda": "Вологодская область",
  "Voronezh": "Воронежская область",
  "Yamal-Nenets": "Ямало-Ненецкий АО",
  "Yaroslavl'": "Ярославская область",
  "Yevrey": "Еврейская АО",
  "Zabaykal'ye": "Забайкальский край",
  "Zabaikalskiy Krai": "Забайкальский край",
  "Chita": "Забайкальский край"
};

const RegionListContainer = styled.div`
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 60px 20px;
  }
`;

const RegionList = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SearchContainer = styled.div`
  max-width: 800px;
  margin: 0 auto 30px;
  position: relative;

  @media (min-width: 768px) {
    margin-bottom: 40px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;
  background: #f8fafc;

  @media (min-width: 768px) {
    font-size: 18px;
    padding: 20px 28px;
  }

  &:focus {
    border-color: #94a3b8;
    background: white;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 20px;

  @media (min-width: 768px) {
    right: 28px;
    font-size: 24px;
  }
`;

const RegionItem = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateX(4px);
  }
`;

const RegionHeader = styled.div<{ isActive: boolean }>`
  padding: 20px 24px;
  background: ${props => props.isActive ? '#1e293b' : '#f8fafc'};
  color: ${props => props.isActive ? 'white' : '#1e293b'};
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  font-size: 16px;

  @media (min-width: 768px) {
    padding: 24px 32px;
    font-size: 20px;
  }

  &:hover {
    background: ${props => props.isActive ? '#1e293b' : '#f1f5f9'};
  }
`;

const RecipeContainer = styled.div<{ isOpen: boolean }>`
  max-height: ${props => props.isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const RegionRecipeList = styled.div`
  padding: 16px;
  background: white;
`;

const ChevronIcon = styled.span<{ isOpen: boolean }>`
  transform: rotate(${props => props.isOpen ? '180deg' : '0deg'});
  transition: transform 0.3s ease;
  display: inline-block;
  margin-left: 8px;
  &::after {
    content: '▼';
    font-size: 12px;
  }
`;

const TopRecipesContainer = styled.div`
  background: white;
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #e2e8f0;

  @media (min-width: 768px) {
    padding: 60px 20px;
  }
`;

const TopRecipesContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const TopRecipesTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 30px 0;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;

  @media (min-width: 768px) {
    font-size: 28px;
    margin-bottom: 40px;
  }
`;

const TopRecipesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopRecipeItem = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateX(4px);
  }
`;

const TopRecipeHeader = styled.div`
  padding: 20px 24px;
  background: #f8fafc;
  color: #1e293b;
  font-weight: 500;
  display: flex;
  align-items: center;
  font-size: 16px;

  @media (min-width: 768px) {
    padding: 24px 32px;
    font-size: 18px;
  }
`;

const RecipeNumber = styled.span`
  background: #1e293b;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  margin-right: 16px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
`;

// Топ 10 рецептов в мае
const topRecipes = [
  { id: 1, name: "Салат «Лаззат» с хрустящими баклажанами", url: "https://www.edimdoma.ru/retsepty/145073-salat-lazzat-s-hrustyaschimi-baklazhanami" },
  { id: 2, name: "Булочки синнабон с корицей", url: "https://www.edimdoma.ru/retsepty/141367-bulochki-sinnabon-s-koritsey" },
  { id: 3, name: "Меренговый рулет", url: "https://www.edimdoma.ru/retsepty/124814-merengovyy-rulet" },
  { id: 4, name: "Тирамису классический", url: "https://www.edimdoma.ru/retsepty/45966-tiramisu-klassicheskiy" },
  { id: 5, name: "Королевская ватрушка", url: "https://www.edimdoma.ru/retsepty/76677-korolevskaya-vatrushka" },
  { id: 6, name: "Творожное печенье «Гусиные лапки»", url: "https://edimdoma.ru/retsepty/76387-tvorozhnoe-pechenie-gusinye-lapki" },
  { id: 7, name: "Творожная запеканка (как в детском саду)", url: "https://www.edimdoma.ru/retsepty/44250-tvorozhnaya-zapekanka-kak-v-detskom-sadu" },
  { id: 8, name: "Кекс в кружке", url: "https://www.edimdoma.ru/retsepty/48979-keks-v-kruzhke" },
  { id: 9, name: "Классический сметанник из песочного теста", url: "https://www.edimdoma.ru/retsepty/72674-bliny-na-kipyatke" },
  { id: 10, name: "Блины на кипятке", url: "https://www.edimdoma.ru/retsepty/46203-vanilnyy-smetannik-iz-pesochnogo-testa" }
];

export const RussiaMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  // Функции управления зумом
  const handleZoomIn = () => {
    if (zoomBehaviorRef.current && svgRef.current) {
      svgRef.current.transition().duration(300).call(
        zoomBehaviorRef.current.scaleBy, 1.5
      );
    }
  };

  const handleZoomOut = () => {
    if (zoomBehaviorRef.current && svgRef.current) {
      svgRef.current.transition().duration(300).call(
        zoomBehaviorRef.current.scaleBy, 1 / 1.5
      );
    }
  };

  const handleResetZoom = () => {
    if (zoomBehaviorRef.current && svgRef.current) {
      svgRef.current.transition().duration(500).call(
        zoomBehaviorRef.current.transform, 
        d3.zoomIdentity
      );
    }
  };

  // Функция для разбивки текста на строки
  const wrapText = (text: string, maxWidth: number, fontSize: number = 12): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Создаем временный элемент для измерения ширины текста
    const tempSvg = d3.select('body').append('svg').style('position', 'absolute').style('visibility', 'hidden');
    const tempText = tempSvg.append('text')
      .attr('font-size', `${fontSize}px`)
      .attr('font-family', 'system-ui, -apple-system, sans-serif');

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      tempText.text(testLine);
      const textWidth = tempText.node()?.getBBox().width || 0;

      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    tempSvg.remove();
    return lines;
  };

  // Получаем отсортированный и отфильтрованный список регионов с рецептами
  const filteredRegions = Object.entries(regionTranslations)
    .map(([key, value]) => ({ 
      englishName: key, 
      russianName: value,
      recipes: (recipesData as RecipesData).regions[value]?.recipes || []
    }))
    .filter(region => 
      region.russianName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.russianName.localeCompare(b.russianName));

  useEffect(() => {
    if (!mapRef.current) return;

    d3.select(mapRef.current).selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Адаптивные настройки для разных устройств
    const isMobile = width <= 768;
    const isSmallMobile = width <= 480;
    
    const padding = isMobile ? (isSmallMobile ? 20 : 40) : 80;
    const verticalPadding = isMobile ? 
      (isSmallMobile ? height * 0.05 : height * 0.08) : 
      height * 0.15;
    
    // Высота карты для мобильных устройств
    const mapHeight = isMobile ? 
      (isSmallMobile ? Math.min(400, height * 0.5) : Math.min(500, height * 0.6)) : 
      height;

    const svg = d3.select(mapRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [
        -padding, 
        -verticalPadding,
        width + padding * 2,
        mapHeight + verticalPadding * 2
      ].join(" "))
      .style("max-width", "100%")
      .style("height", "auto")
      .style("overflow", isMobile ? "hidden" : "visible")
      .style("z-index", "1");

    // Сохраняем ссылку на SVG для управления зумом
    svgRef.current = svg;

    // Настройка зума только для мобильных устройств
    if (isMobile) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on("zoom", (event) => {
          const { transform } = event;
          setZoomLevel(transform.k);
          g.attr("transform", `translate(${transform.x}, ${transform.y + verticalPadding/2}) scale(${transform.k})`);
        });

      svg.call(zoom);
      zoomBehaviorRef.current = zoom;
    }

    // Добавляем определение для фильтра тени
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");

    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");

    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("result", "offsetBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

    // Группа для карты
    const g = svg.append("g")
      .attr("transform", isMobile ? `translate(0, ${verticalPadding/2})` : `translate(0, ${verticalPadding/2})`);

    // Группа для всплывающих окон с повышенным z-index
    const popupGroup = svg.append("g")
      .attr("class", "popup-group")
      .style("z-index", "1000");

    const projection = d3.geoAlbers()
      .rotate([-105, 0])
      .center([2, 56])
      .parallels([50, 70])
      .scale(isMobile ? 
        (isSmallMobile ? Math.min(width, mapHeight) * 0.8 : Math.min(width, mapHeight) * 1.0) : 
        Math.min(width, height) * 1.45)
      .translate([
        (width + padding * 2) / 2,
        (isMobile ? mapHeight : height) / 2 + verticalPadding/2
      ]);

    const path = d3.geoPath().projection(projection);

    const regions = g.selectAll("path")
      .data((russiaGeoData as any).features)
      .enter()
      .append("path")
      .attr("d", path as any)
      .attr("fill", "#e2e8f0")
      .attr("stroke", "#475569")
      .attr("stroke-width", 0.5)
      .style("outline", "none")
      .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)")
      .style("-webkit-touch-callout", "none");

    const updatePopup = (d: any) => {
      popupGroup.selectAll("*").remove();

      if (!d) return;

      const englishName = d.properties?.NAME_1 || 'Unknown Region';
      const name = regionTranslations[englishName] || 'Неизвестный регион';
      const recipes = (recipesData as RecipesData).regions[name]?.recipes || [];
      
      // Адаптивные настройки для всплывающих окон
      const isMobile = window.innerWidth <= 768;
      const isSmallMobile = window.innerWidth <= 480;
      
      // Создаем временный элемент для измерения ширины текста
      const tempText = svg.append("text")
        .attr("font-size", isMobile ? (isSmallMobile ? "18px" : "20px") : "22px")
        .attr("font-weight", "700")
        .text(name);
      const textWidth = tempText.node()?.getBBox().width || 0;
      tempText.remove();

      const padding = isMobile ? (isSmallMobile ? 16 : 20) : 24;
      const maxWidth = isMobile ? (isSmallMobile ? 250 : 300) : 320;
      const popupWidth = Math.max(
        isMobile ? (isSmallMobile ? 200 : 240) : 280, 
        Math.min(maxWidth, textWidth + (padding * 2))
      );
      
      // Рассчитываем высоту с учетом переносов строк для рецептов
      let totalRecipeLines = 0;
      const recipeLines: string[][] = [];
      
      const recipeFontSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
      
      recipes.slice(0, 3).forEach(recipe => {
        const lines = wrapText(recipe.name, popupWidth - (padding * 2), recipeFontSize);
        recipeLines.push(lines);
        totalRecipeLines += lines.length;
      });
      
      const baseHeight = isMobile ? (isSmallMobile ? 60 : 70) : 80;
      const recipeLineHeight = isMobile ? (isSmallMobile ? 16 : 18) : 20;
      const recipeSpacing = isMobile ? 6 : 8;
      const popupHeight = recipes.length > 0 
        ? baseHeight + (totalRecipeLines * recipeLineHeight) + (recipes.slice(0, 3).length * recipeSpacing)
        : baseHeight;
      
      const verticalOffset = 15;
      
      const centroid = path.centroid(d);
      
      // Проверяем границы экрана
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Получаем координаты в пикселях относительно SVG
      const svgElement = svg.node();
      if (!svgElement) return;
      
      const svgRect = svgElement.getBoundingClientRect();
      const point = {
        x: centroid[0] + svgRect.left,
        y: centroid[1] + svgRect.top - verticalOffset
      };
      
      // Корректируем позицию
      let adjustedX = centroid[0];
      let adjustedY = centroid[1] - verticalOffset;
      
      if (point.x - popupWidth/2 < 0) {
        adjustedX = centroid[0] + (popupWidth/2 - point.x);
      } else if (point.x + popupWidth/2 > viewportWidth) {
        adjustedX = centroid[0] - (point.x + popupWidth/2 - viewportWidth);
      }
      
      if (point.y - popupHeight < 0) {
        adjustedY = centroid[1] + verticalOffset + popupHeight + 20;
      }
      
      const popup = popupGroup.append("g")
        .attr("transform", `translate(${adjustedX}, ${adjustedY})`)
        .style("pointer-events", "none");

      // Фон всплывающего окна
      popup.append("rect")
        .attr("x", -popupWidth / 2)
        .attr("y", -popupHeight / 2)
        .attr("width", popupWidth)
        .attr("height", popupHeight)
        .attr("rx", 12)
        .attr("fill", "white")
        .attr("opacity", 1)
        .attr("filter", "url(#drop-shadow)")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1)
        .style("pointer-events", "none");

      // Стрелка внизу окна
      const arrowSize = 8;
      popup.append("polygon")
        .attr("points", `0,${popupHeight/2} ${-arrowSize},${popupHeight/2 - arrowSize} ${arrowSize},${popupHeight/2 - arrowSize}`)
        .attr("fill", "white")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1)
        .style("pointer-events", "none");

      // Название региона (крупный черный текст)
      popup.append("text")
        .attr("x", 0)
        .attr("y", -popupHeight / 2 + (isMobile ? (isSmallMobile ? 28 : 32) : 35))
        .attr("text-anchor", "middle")
        .attr("fill", "#1a1a1a")
        .attr("font-weight", "700")
        .attr("font-size", isMobile ? (isSmallMobile ? "18px" : "20px") : "22px")
        .attr("font-family", "system-ui, -apple-system, sans-serif")
        .style("pointer-events", "none")
        .text(name);

      // Рецепты как синие ссылки с переносом текста
      if (recipes.length > 0) {
        let currentY = isMobile ? (isSmallMobile ? 50 : 58) : 65;
        
        recipes.slice(0, 3).forEach((recipe, i) => {
          const lines = recipeLines[i];
          
          const recipeGroup = popup.append("g")
            .style("pointer-events", "all")
            .style("cursor", "pointer");

          // Создаем ссылку
          const link = recipeGroup.append("a")
            .attr("xlink:href", recipe.url)
            .attr("target", "_blank")
            .attr("rel", "noopener noreferrer");

          // Добавляем невидимую область для клика (размер по всем строкам)
          const clickAreaHeight = lines.length * recipeLineHeight;
          link.append("rect")
            .attr("x", -popupWidth / 2 + 12)
            .attr("y", -popupHeight / 2 + currentY - 10)
            .attr("width", popupWidth - 24)
            .attr("height", clickAreaHeight)
            .attr("fill", "transparent");

          // Добавляем текст рецепта построчно
          lines.forEach((line, lineIndex) => {
            const textElement = link.append("text")
              .attr("x", 0)
              .attr("y", -popupHeight / 2 + currentY + (lineIndex * recipeLineHeight))
              .attr("text-anchor", "middle")
              .attr("fill", "#2563eb")
              .attr("font-size", `${recipeFontSize}px`)
              .attr("font-weight", "400")
              .attr("font-family", "system-ui, -apple-system, sans-serif")
              .style("text-decoration", "underline")
              .style("transition", "fill 0.2s ease")
              .text(line);
          });

          // Добавляем hover эффект для всей ссылки
          link
            .on("mouseover", function() {
              d3.select(this).selectAll("text")
                .transition()
                .duration(150)
                .attr("fill", "#1d4ed8");
            })
            .on("mouseout", function() {
              d3.select(this).selectAll("text")
                .transition()
                .duration(150)
                .attr("fill", "#2563eb");
            });

          // Обновляем позицию для следующего рецепта
          currentY += (lines.length * recipeLineHeight) + recipeSpacing;
        });
      } else {
        // Показываем сообщение если нет рецептов
        popup.append("text")
          .attr("x", 0)
          .attr("y", -popupHeight / 2 + (isMobile ? (isSmallMobile ? 50 : 58) : 65))
          .attr("text-anchor", "middle")
          .attr("fill", "#64748b")
          .attr("font-size", isMobile ? (isSmallMobile ? "12px" : "13px") : "14px")
          .attr("font-style", "italic")
          .style("pointer-events", "none")
          .text("Рецепты скоро появятся");
      }
    };

    regions
      .style("cursor", "pointer")
      .on("mouseover", function() {
        if (!isMobile) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("fill", "#cbd5e1")
            .attr("opacity", 0.7);
        }
      })
      .on("mouseout", function() {
        if (!isMobile) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("fill", "#e2e8f0")
            .attr("opacity", 1);
        }
      })
      .on("mousedown", function(event) {
        event.preventDefault();
      })
      .on("click", function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        // На мобильных устройствах добавляем visual feedback
        if (isMobile) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("fill", "#cbd5e1")
            .transition()
            .duration(100)
            .attr("fill", "#e2e8f0");
        }
        
        updatePopup(d);
      });

    // Отключаем клик по SVG на мобильных устройствах для корректной работы зума
    if (!isMobile) {
      svg.on("click", function(event) {
        if (event.target.tagName === 'svg') {
          updatePopup(null);
        }
      });
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // Адаптивные настройки для разных устройств (такие же как при инициализации)
      const isMobile = newWidth <= 768;
      const isSmallMobile = newWidth <= 480;
      
      const newPadding = isMobile ? (isSmallMobile ? 20 : 40) : 80;
      const newVerticalPadding = isMobile ? 
        (isSmallMobile ? newHeight * 0.05 : newHeight * 0.08) : 
        newHeight * 0.15;
      
      const newMapHeight = isMobile ? 
        (isSmallMobile ? Math.min(400, newHeight * 0.5) : Math.min(500, newHeight * 0.6)) : 
        newHeight;
      
      svg.attr("viewBox", [
        -newPadding,
        -newVerticalPadding,
        newWidth + newPadding * 2,
        newMapHeight + newVerticalPadding * 2
      ].join(" "));
      
      projection
        .scale(isMobile ? 
          (isSmallMobile ? Math.min(newWidth, newMapHeight) * 0.8 : Math.min(newWidth, newMapHeight) * 1.0) : 
          Math.min(newWidth, newHeight) * 1.45)
        .translate([
          (newWidth + newPadding * 2) / 2,
          (isMobile ? newMapHeight : newHeight) / 2 + newVerticalPadding/2
        ]);
      
      regions.attr("d", path as any);
      
      // Переинициализация зума при изменении размера экрана
      if (isMobile && zoomBehaviorRef.current) {
        // Сбрасываем зум при resize
        svg.call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
        setZoomLevel(1);
      } else if (!isMobile && zoomBehaviorRef.current) {
        // Отключаем зум на десктопе
        svg.on(".zoom", null);
        zoomBehaviorRef.current = null;
        g.attr("transform", `translate(0, ${newVerticalPadding/2})`);
        setZoomLevel(1);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Очищаем ссылки при размонтировании
      zoomBehaviorRef.current = null;
      svgRef.current = null;
    };
  }, []);

  return (
    <MapContainer>
      <TopRecipesContainer>
        <TopRecipesContent>
          <TopRecipesTitle>Топ 10 рецептов в мае</TopRecipesTitle>
          <TopRecipesList>
            {topRecipes.map((recipe) => (
              <TopRecipeItem key={recipe.id}>
                <TopRecipeHeader>
                  <RecipeNumber>{recipe.id}</RecipeNumber>
                  <RecipeLink 
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {recipe.name}
                  </RecipeLink>
                </TopRecipeHeader>
              </TopRecipeItem>
            ))}
          </TopRecipesList>
        </TopRecipesContent>
      </TopRecipesContainer>
      <MapWrapper ref={mapRef} />
      <ZoomControls>
        <ZoomButton 
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          aria-label="Увеличить карту"
        >
          +
        </ZoomButton>
        <ZoomButton 
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.5}
          aria-label="Уменьшить карту"
        >
          −
        </ZoomButton>
        <ResetZoomButton 
          onClick={handleResetZoom}
          aria-label="Сбросить масштаб"
        >
          Сброс
        </ResetZoomButton>
      </ZoomControls>
      <RegionListContainer>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Поиск региона..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchIcon>🔍</SearchIcon>
        </SearchContainer>
        <RegionList>
          {filteredRegions.map((region) => (
            <RegionItem key={region.englishName}>
              <RegionHeader 
                isActive={expandedRegion === region.russianName}
                onClick={() => setExpandedRegion(
                  expandedRegion === region.russianName ? null : region.russianName
                )}
              >
                {region.russianName}
                <ChevronIcon isOpen={expandedRegion === region.russianName} />
              </RegionHeader>
              <RecipeContainer isOpen={expandedRegion === region.russianName}>
                <RegionRecipeList>
                  {region.recipes.map((recipe) => (
                    <RegionRecipeItem key={recipe.id}>
                      <RecipeLink 
                        href={recipe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {recipe.name}
                      </RecipeLink>
                    </RegionRecipeItem>
                  ))}
                </RegionRecipeList>
              </RecipeContainer>
            </RegionItem>
          ))}
        </RegionList>
      </RegionListContainer>
    </MapContainer>
  );
}; 