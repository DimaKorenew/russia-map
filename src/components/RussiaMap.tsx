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
  background: white;
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
  views: string;
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
  font-size: 18px;
  font-weight: 500;

  @media (min-width: 768px) {
    font-size: 30px;
  }

  @media (max-width: 768px) {
    font-size: 17px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }

  &:hover {
    color: #2563eb;
  }
`;

const RegionRecipeItem = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: white;
  margin-bottom: 8px;
  transition: all 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }

  @media (max-width: 768px) {
    padding: 10px;
    margin-bottom: 6px;
    border-radius: 6px;
  }

  @media (max-width: 480px) {
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 4px;
  }
`;

interface RegionInfo {
  name: string;
  position: [number, number];
  recipes: Recipe[];
}

const FullWidthContainer = styled.div`
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  background: white;
  
  @media (max-width: 768px) {
    padding: 0;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }
`;

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
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 60px 20px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
  }
`;

const RegionList = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0;
    gap: 8px;
  }

  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const SearchContainer = styled.div`
  max-width: 800px;
  margin: 0 auto 30px;
  position: relative;

  @media (min-width: 768px) {
    margin-bottom: 40px;
  }

  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0 0 20px 0;
  }

  @media (max-width: 480px) {
    margin-bottom: 16px;
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
  background: white;

  @media (min-width: 768px) {
    font-size: 18px;
    padding: 20px 28px;
  }

  @media (max-width: 768px) {
    padding: 14px 20px;
    font-size: 15px;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    padding: 12px 18px;
    font-size: 14px;
    border-radius: 8px;
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
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const RegionHeader = styled.div<{ isActive: boolean }>`
  padding: 20px 24px;
  background: ${props => props.isActive ? '#1e293b' : 'white'};
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

  @media (max-width: 768px) {
    padding: 16px 20px;
    font-size: 15px;
  }

  @media (max-width: 480px) {
    padding: 14px 16px;
    font-size: 14px;
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

  @media (max-width: 768px) {
    padding: 12px 16px;
  }

  @media (max-width: 480px) {
    padding: 10px 12px;
  }
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
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  @media (min-width: 768px) {
    padding: 30px 20px 60px;
  }

  @media (max-width: 768px) {
    padding: 20px 0;
  }

  @media (max-width: 480px) {
    padding: 16px 0;
  }
`;

const TopRecipesContent = styled.div`
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0;
    padding: 0 16px;
  }

  @media (max-width: 480px) {
    padding: 0 12px;
  }
`;

const TopRecipesTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 30px 0;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;

  @media (min-width: 768px) {
    font-size: 36px;
    margin-bottom: 40px;
  }

  @media (max-width: 768px) {
    font-size: 28px;
    margin-bottom: 20px;
  }

  @media (max-width: 480px) {
    font-size: 24px;
    margin-bottom: 16px;
  }
`;

const DescriptionText = styled.p`
  font-size: 16px;
  color: #475569;
  text-align: center;
  line-height: 1.6;
  margin: 0 0 30px 0;
  font-family: system-ui, -apple-system, sans-serif;

  @media (min-width: 768px) {
    font-size: 18px;
    margin-bottom: 40px;
  }

  @media (max-width: 768px) {
    font-size: 15px;
    margin-bottom: 20px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
    margin-bottom: 16px;
  }
`;

const MapTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;
  padding: 40px 20px 0;

  @media (min-width: 768px) {
    font-size: 28px;
    margin-bottom: 24px;
    padding: 60px 20px 0;
  }

  @media (max-width: 768px) {
    font-size: 22px;
    margin-bottom: 16px;
    padding: 30px 16px 0;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    margin-bottom: 12px;
    padding: 20px 12px 0;
  }
`;

const MapDescription = styled.div`
  font-size: 16px;
  color: #475569;
  text-align: left;
  line-height: 1.5;
  margin: 0 auto 30px;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 800px;
  padding: 20px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  
  p {
    margin: 0 0 10px 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  a {
    color: #2563eb;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  @media (min-width: 768px) {
    font-size: 18px;
    margin-bottom: 40px;
  }

  @media (max-width: 768px) {
    font-size: 15px;
    margin-bottom: 20px;
    padding: 16px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
    margin-bottom: 16px;
    padding: 12px;
  }
`;

const MapTitleSection = styled.div`
  padding: 40px 20px 20px;
  text-align: center;
  position: relative;

  @media (max-width: 768px) {
    padding: 30px 16px 16px;
  }

  @media (max-width: 480px) {
    padding: 20px 12px 12px;
  }
`;

const Logo = styled.img`
  position: absolute;
  top: 40px;
  left: 40px;
  height: 4.0625rem;
  width: 12.1875rem;
  background-size: contain;
  z-index: 10;

  @media (max-width: 1150px) {
    position: relative;
    top: auto;
    left: auto;
    margin: 0 auto 16px;
    display: block;
    height: 50px;
    width: auto;
    content: url('https://e3.edimdoma.ru/assets/layout/header-logo-62682971ac00ab99dc6e222e36ce620a3292f91f50b77b1d37d157bec0c592ce.png');
  }

  @media (max-width: 480px) {
    height: 50px;
  }
`;

const MapPageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;

  @media (min-width: 768px) {
    font-size: 36px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    font-size: 28px;
    margin-bottom: 16px;
  }

  @media (max-width: 480px) {
    font-size: 24px;
    margin-bottom: 12px;
  }
`;

const TopRecipesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 8px;
  }

  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const TopRecipeItem = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    border-radius: 8px;
  }
`;

const TopRecipeHeader = styled.div`
  padding: 20px 24px;
  background: white;
  color: #1e293b;
  font-weight: 500;
  display: flex;
  align-items: center;
  font-size: 16px;

  @media (min-width: 768px) {
    padding: 24px 32px;
    font-size: 18px;
  }

  @media (max-width: 768px) {
    padding: 16px 24px;
    font-size: 15px;
  }

  @media (max-width: 480px) {
    padding: 14px 20px;
    font-size: 14px;
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

  @media (max-width: 768px) {
    width: 26px;
    height: 26px;
    font-size: 13px;
    margin-right: 12px;
  }

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
    font-size: 12px;
    margin-right: 10px;
  }
`;

const RecipeContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
`;

const RecipeViews = styled.div`
  color: #64748b;
  font-size: 14px;
  font-weight: 400;
  margin-top: 4px;

  @media (min-width: 768px) {
    font-size: 15px;
    margin-top: 6px;
  }

  @media (max-width: 768px) {
    font-size: 13px;
    margin-top: 3px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
    margin-top: 2px;
  }
`;

const Footer = styled.footer`
  background-color: #1e293b;
  color: white;
  padding: 40px 0 20px;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 30px 0 15px;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  
  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const FooterTop = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 30px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
`;

const FooterTitle = styled.h2`
  color: white;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 40px 0;
  font-family: system-ui, -apple-system, sans-serif;
  
  @media (max-width: 768px) {
    font-size: 24px;
    margin-bottom: 30px;
  }
  
  @media (max-width: 480px) {
    font-size: 20px;
    margin-bottom: 20px;
  }
`;

const FooterSection = styled.div`
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      margin-bottom: 8px;
      
      a {
        color: #94a3b8;
        text-decoration: none;
        font-size: 14px;
        transition: color 0.2s ease;
        
        &:hover {
          color: white;
        }
        
        @media (max-width: 768px) {
          font-size: 13px;
        }
        
        &.category-title {
          color: white;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 12px;
          display: block;
          
          @media (max-width: 768px) {
            font-size: 15px;
            margin-bottom: 10px;
          }
          
          &:hover {
            color: #e2e8f0;
          }
        }
      }
      
      &.subcategory {
        margin-bottom: 6px;
      }
      
      &:first-child {
        margin-bottom: 12px;
      }
    }
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid #374151;
  padding-top: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  
  @media (max-width: 768px) {
    padding-top: 15px;
    font-size: 12px;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 15px;
  
  a {
    color: #94a3b8;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s ease;
    
    &:hover {
      color: white;
    }
    
    @media (max-width: 768px) {
      font-size: 13px;
    }
  }
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
`;

// Топ 10 рецептов в мае
const topRecipes = [
  { id: 1, name: "Булочки синнабон с корицей", url: "https://www.edimdoma.ru/retsepty/141367-bulochki-sinnabon-s-koritsey", views: "707 тыс. просмотров" },
  { id: 2, name: "Меренговый рулет", url: "https://www.edimdoma.ru/retsepty/124814-merengovyy-rulet", views: "510 тыс. просмотров" },
  { id: 3, name: "Тирамису классический", url: "https://www.edimdoma.ru/retsepty/45966-tiramisu-klassicheskiy", views: "340 тыс. просмотров" },
  { id: 4, name: "Салат «Лаззат» с хрустящими баклажанами", url: "https://www.edimdoma.ru/retsepty/145073-salat-lazzat-s-hrustyaschimi-baklazhanami", views: "316 тыс. просмотров" },
  { id: 5, name: "Королевская ватрушка", url: "https://www.edimdoma.ru/retsepty/76677-korolevskaya-vatrushka", views: "275 тыс. просмотров" },
  { id: 6, name: "Блины на кипятке", url: "https://www.edimdoma.ru/retsepty/72674-bliny-na-kipyatke", views: "207 тыс. просмотров" },
  { id: 7, name: "Творожное печенье «Гусиные лапки»", url: "https://www.edimdoma.ru/retsepty/76387-tvorozhnoe-pechenie-gusinye-lapki", views: "205 тыс. просмотров" },
  { id: 8, name: "Творожная запеканка (как в детском саду)", url: "https://www.edimdoma.ru/retsepty/44250-tvorozhnaya-zapekanka-kak-v-detskom-sadu", views: "171 тыс. просмотров" },
  { id: 9, name: "Традиционное корейское кимчи", url: "https://www.edimdoma.ru/retsepty/37514-traditsionnoe-koreyskoe-kimchi", views: "167 тыс. просмотров" },
  { id: 10, name: "Кыстыбый с картофелем", url: "https://www.edimdoma.ru/retsepty/63927-kystybyy-s-kartofelem", views: "151 тыс. просмотров" }
];

export const RussiaMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const centerTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
      recipes: (recipesData as any).regions[value]?.recipes || []
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
    
    const padding = isMobile ? (isSmallMobile ? 10 : 20) : 25;
    const verticalPadding = isMobile ? 
      (isSmallMobile ? height * 0.03 : height * 0.05) : 
      height * 0.06;
    
    // Высота карты для мобильных устройств
    const mapHeight = isMobile ? 
      (isSmallMobile ? Math.min(400, height * 0.5) : Math.min(500, height * 0.6)) : 
      height;

    // Доступная область для карты
    const availableWidth = width - padding * 2;
    const availableHeight = (isMobile ? mapHeight : height) - verticalPadding * 2;

    const svg = d3.select(mapRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [
        0, 
        0,
        width,
        isMobile ? mapHeight : height
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
          g.attr("transform", `${transform} translate(${centerTranslateRef.current.x}, ${centerTranslateRef.current.y})`);
          // Обновляем всплывающие окна при зуме (закрываем их)
          popupGroup.selectAll("*").remove();
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

    // Создаем проекцию для вычисления bounds
    const projection = d3.geoAlbers()
      .rotate([-105, 0])
      .center([2, 56])
      .parallels([50, 70])
      .scale(1000) // Временный масштаб для вычисления bounds
      .translate([0, 0]); // Временная позиция

    const path = d3.geoPath().projection(projection);

    // Вычисляем bounds карты
    const bounds = path.bounds(russiaGeoData as any);
    const boundsWidth = bounds[1][0] - bounds[0][0];
    const boundsHeight = bounds[1][1] - bounds[0][1];

    // Вычисляем оптимальный масштаб, чтобы карта помещалась в доступное пространство
    // Увеличиваем коэффициент для более крупной карты, но оставляем запас для стабильности
    const scale = 0.98 * Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight) * 1000;

    // Вычисляем центр карты в bounds
    const boundsCenter = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];

    // Устанавливаем финальные параметры проекции
    projection
      .scale(scale)
      .translate([width / 2, (isMobile ? mapHeight : height) / 2]);

    // Пересчитываем bounds с новым масштабом
    const newBounds = path.bounds(russiaGeoData as any);
    const newBoundsCenter = [(newBounds[0][0] + newBounds[1][0]) / 2, (newBounds[0][1] + newBounds[1][1]) / 2];

    // Корректируем перевод, чтобы центрировать карту
    const centerTranslateX = width / 2 - newBoundsCenter[0];
    const centerTranslateY = (isMobile ? mapHeight : height) / 2 - newBoundsCenter[1];

    // Группа для карты с правильным центрированием
    const g = svg.append("g")
      .attr("transform", `translate(${centerTranslateX}, ${centerTranslateY})`);

    // Группа для всплывающих окон с повышенным z-index
    const popupGroup = svg.append("g")
      .attr("class", "popup-group")
      .style("z-index", "1000");

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

    const updatePopup = (d: any, currentScale: number = 1) => {
      popupGroup.selectAll("*").remove();

      if (!d) return;

      const englishName = d.properties?.NAME_1 || 'Unknown Region';
      const name = regionTranslations[englishName] || 'Неизвестный регион';
      const recipes = (recipesData as any).regions[name]?.recipes || [];
      
      // Адаптивные настройки для всплывающих окон
      const isMobile = window.innerWidth <= 768;
      const isSmallMobile = window.innerWidth <= 480;
      
      // Вычисляем масштабный коэффициент для всплывающих окон
      // Чем больше карта, тем больше всплывающие окна
      const mapScale = Math.max(0.6, Math.min(1.4, currentScale));
      const popupScale = isMobile ? Math.max(0.7, mapScale * 0.8) : mapScale;
      
      // Размеры с учетом масштаба карты
      const baseFontSize = isMobile ? (isSmallMobile ? 18 : 20) : 22;
      const titleFontSize = Math.round(baseFontSize * popupScale);
      
      // Создаем временный элемент для измерения ширины текста
      const tempText = svg.append("text")
        .attr("font-size", `${titleFontSize}px`)
        .attr("font-weight", "700")
        .text(name);
      const textWidth = tempText.node()?.getBBox().width || 0;
      tempText.remove();

      const basePadding = isMobile ? (isSmallMobile ? 16 : 20) : 24;
      const padding = Math.round(basePadding * popupScale);
      
      const baseMaxWidth = isMobile ? (isSmallMobile ? 250 : 300) : 320;
      const maxWidth = Math.round(baseMaxWidth * popupScale);
      
      const baseMinWidth = isMobile ? (isSmallMobile ? 200 : 240) : 280;
      const minWidth = Math.round(baseMinWidth * popupScale);
      
      const popupWidth = Math.max(
        minWidth, 
        Math.min(maxWidth, textWidth + (padding * 2))
      );
      
      // Рассчитываем высоту с учетом переносов строк для рецептов
      let totalRecipeLines = 0;
      const recipeLines: string[][] = [];
      
      const baseRecipeFontSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
      const recipeFontSize = Math.round(baseRecipeFontSize * popupScale);
      
      recipes.slice(0, 3).forEach(recipe => {
        const lines = wrapText(recipe.name, popupWidth - (padding * 2), recipeFontSize);
        recipeLines.push(lines);
        totalRecipeLines += lines.length;
      });
      
      const baseBaseHeight = isMobile ? (isSmallMobile ? 60 : 70) : 80;
      const baseHeight = Math.round(baseBaseHeight * popupScale);
      
      const baseRecipeLineHeight = isMobile ? (isSmallMobile ? 16 : 18) : 20;
      const recipeLineHeight = Math.round(baseRecipeLineHeight * popupScale);
      
      const baseRecipeSpacing = isMobile ? 6 : 8;
      const recipeSpacing = Math.round(baseRecipeSpacing * popupScale);
      
      const popupHeight = recipes.length > 0 
        ? baseHeight + (totalRecipeLines * recipeLineHeight) + (recipes.slice(0, 3).length * recipeSpacing)
        : baseHeight;
      
      // Получаем центроид региона с учетом трансформации
      const centroid = path.centroid(d);
      const transformedCentroid = [centroid[0] + centerTranslateRef.current.x, centroid[1] + centerTranslateRef.current.y];
      
      // Получаем границы региона для лучшего позиционирования
      const regionBounds = path.bounds(d);
      const regionTop = regionBounds[0][1] + centerTranslateRef.current.y;
      const regionBottom = regionBounds[1][1] + centerTranslateRef.current.y;
      const regionLeft = regionBounds[0][0] + centerTranslateRef.current.x;
      const regionRight = regionBounds[1][0] + centerTranslateRef.current.x;
      const regionHeight = regionBottom - regionTop;
      
      // Проверяем границы экрана
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Отступ от региона с учетом масштаба
      const baseVerticalOffset = Math.round(30 * popupScale);
      const minVerticalOffset = Math.round(20 * popupScale);
      
      // Начальная позиция - над регионом
      let adjustedX = transformedCentroid[0];
      let adjustedY = regionTop - popupHeight/2 - baseVerticalOffset;
      
      // Определяем отступы с меньшими значениями для большей карты
      const horizontalMargin = isMobile ? (isSmallMobile ? 10 : 15) : 15;
      const verticalMargin = isMobile ? (isSmallMobile ? 10 : 15) : 15;
      
      // Проверяем выход за границы по вертикали (сверху) с меньшими отступами
      if (adjustedY - popupHeight/2 < verticalMargin) {
        // Если не помещается сверху, размещаем снизу
        adjustedY = regionBottom + popupHeight/2 + baseVerticalOffset;
        
        // Если и снизу не помещается, размещаем сбоку
        if (adjustedY + popupHeight/2 > viewportHeight - verticalMargin) {
          adjustedY = transformedCentroid[1];
          
          // Пробуем справа
          if (regionRight + popupWidth/2 + baseVerticalOffset < viewportWidth - horizontalMargin) {
            adjustedX = regionRight + popupWidth/2 + baseVerticalOffset;
          }
          // Пробуем слева
          else if (regionLeft - popupWidth/2 - baseVerticalOffset > horizontalMargin) {
            adjustedX = regionLeft - popupWidth/2 - baseVerticalOffset;
          }
          // Если не помещается ни справа, ни слева, размещаем по центру с минимальным отступом
          else {
            adjustedY = Math.max(popupHeight/2 + verticalMargin, Math.min(regionTop - popupHeight/2 - minVerticalOffset, viewportHeight - popupHeight/2 - verticalMargin));
          }
        }
      }
      
      // Проверяем выход за границы по горизонтали с меньшими отступами
      if (adjustedX - popupWidth/2 < horizontalMargin) {
        adjustedX = horizontalMargin + popupWidth/2;
      } else if (adjustedX + popupWidth/2 > viewportWidth - horizontalMargin) {
        adjustedX = viewportWidth - horizontalMargin - popupWidth/2;
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

      // Определяем направление стрелки в зависимости от позиции окна относительно региона
      const baseArrowSize = 8;
      const arrowSize = Math.round(baseArrowSize * popupScale);
      
      let arrowPoints = "";
      let arrowPosition = { x: 0, y: popupHeight/2 };
      
      // Если окно над регионом - стрелка вниз
      if (adjustedY < regionTop) {
        arrowPoints = `0,${popupHeight/2} ${-arrowSize},${popupHeight/2 - arrowSize} ${arrowSize},${popupHeight/2 - arrowSize}`;
        arrowPosition = { x: 0, y: popupHeight/2 };
      }
      // Если окно под регионом - стрелка вверх
      else if (adjustedY > regionBottom) {
        arrowPoints = `0,${-popupHeight/2} ${-arrowSize},${-popupHeight/2 + arrowSize} ${arrowSize},${-popupHeight/2 + arrowSize}`;
        arrowPosition = { x: 0, y: -popupHeight/2 };
      }
      // Если окно справа от региона - стрелка влево
      else if (adjustedX > transformedCentroid[0]) {
        arrowPoints = `${-popupWidth/2},0 ${-popupWidth/2 + arrowSize},${-arrowSize} ${-popupWidth/2 + arrowSize},${arrowSize}`;
        arrowPosition = { x: -popupWidth/2, y: 0 };
      }
      // Если окно слева от региона - стрелка вправо
      else if (adjustedX < transformedCentroid[0]) {
        arrowPoints = `${popupWidth/2},0 ${popupWidth/2 - arrowSize},${-arrowSize} ${popupWidth/2 - arrowSize},${arrowSize}`;
        arrowPosition = { x: popupWidth/2, y: 0 };
      }
      // По умолчанию стрелка вниз
      else {
        arrowPoints = `0,${popupHeight/2} ${-arrowSize},${popupHeight/2 - arrowSize} ${arrowSize},${popupHeight/2 - arrowSize}`;
        arrowPosition = { x: 0, y: popupHeight/2 };
      }
      
      popup.append("polygon")
        .attr("points", arrowPoints)
        .attr("fill", "white")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", Math.max(1, Math.round(popupScale)))
        .style("pointer-events", "none");

      // Название региона (крупный черный текст)
      const baseTitleOffset = isMobile ? (isSmallMobile ? 28 : 32) : 35;
      const titleOffset = Math.round(baseTitleOffset * popupScale);
      
      popup.append("text")
        .attr("x", 0)
        .attr("y", -popupHeight / 2 + titleOffset)
        .attr("text-anchor", "middle")
        .attr("fill", "#1a1a1a")
        .attr("font-weight", "700")
        .attr("font-size", `${titleFontSize}px`)
        .attr("font-family", "system-ui, -apple-system, sans-serif")
        .style("pointer-events", "none")
        .text(name);

      // Рецепты как синие ссылки с переносом текста
      if (recipes.length > 0) {
        const baseCurrentY = isMobile ? (isSmallMobile ? 50 : 58) : 65;
        let currentY = Math.round(baseCurrentY * popupScale);
        
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
        const baseNoDataOffset = isMobile ? (isSmallMobile ? 50 : 58) : 65;
        const noDataOffset = Math.round(baseNoDataOffset * popupScale);
        
        const baseNoDataFontSize = isMobile ? (isSmallMobile ? 12 : 13) : 14;
        const noDataFontSize = Math.round(baseNoDataFontSize * popupScale);
        
        popup.append("text")
          .attr("x", 0)
          .attr("y", -popupHeight / 2 + noDataOffset)
          .attr("text-anchor", "middle")
          .attr("fill", "#64748b")
          .attr("font-size", `${noDataFontSize}px`)
          .attr("font-style", "italic")
          .style("pointer-events", "none")
          .text("нет данных");
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
        
        updatePopup(d, projection.scale() / 1000);
      });

    // Отключаем клик по SVG на мобильных устройствах для корректной работы зума
    if (!isMobile) {
      svg.on("click", function(event) {
        if (event.target.tagName === 'svg') {
          updatePopup(null, 1);
        }
      });
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // Адаптивные настройки для разных устройств
      const isMobile = newWidth <= 768;
      const isSmallMobile = newWidth <= 480;
      
             const newPadding = isMobile ? (isSmallMobile ? 10 : 20) : 25;
       const newVerticalPadding = isMobile ? 
         (isSmallMobile ? newHeight * 0.03 : newHeight * 0.05) : 
         newHeight * 0.06;
      
      const newMapHeight = isMobile ? 
        (isSmallMobile ? Math.min(400, newHeight * 0.5) : Math.min(500, newHeight * 0.6)) : 
        newHeight;
      
      // Доступная область для карты
      const newAvailableWidth = newWidth - newPadding * 2;
      const newAvailableHeight = (isMobile ? newMapHeight : newHeight) - newVerticalPadding * 2;

      // Пересчитываем масштаб для нового размера
      const tempProjection = d3.geoAlbers()
        .rotate([-105, 0])
        .center([2, 56])
        .parallels([50, 70])
        .scale(1000)
        .translate([0, 0]);

      const tempPath = d3.geoPath().projection(tempProjection);
      const tempBounds = tempPath.bounds(russiaGeoData as any);
      const tempBoundsWidth = tempBounds[1][0] - tempBounds[0][0];
      const tempBoundsHeight = tempBounds[1][1] - tempBounds[0][1];

             const newScale = 0.98 * Math.min(newAvailableWidth / tempBoundsWidth, newAvailableHeight / tempBoundsHeight) * 1000;

      // Обновляем проекцию
      projection
        .scale(newScale)
        .translate([newWidth / 2, (isMobile ? newMapHeight : newHeight) / 2]);

      // Пересчитываем центрирование
      const newBounds = path.bounds(russiaGeoData as any);
      const newBoundsCenter = [(newBounds[0][0] + newBounds[1][0]) / 2, (newBounds[0][1] + newBounds[1][1]) / 2];
      const newCenterTranslateX = newWidth / 2 - newBoundsCenter[0];
      const newCenterTranslateY = (isMobile ? newMapHeight : newHeight) / 2 - newBoundsCenter[1];
      
      svg.attr("viewBox", [
        0,
        0,
        newWidth,
        isMobile ? newMapHeight : newHeight
      ].join(" "));
      
      // Обновляем трансформацию группы карты
      g.attr("transform", `translate(${newCenterTranslateX}, ${newCenterTranslateY})`);
      
      regions.attr("d", path as any);
      
      // Переинициализация зума при изменении размера экрана
      if (isMobile && !zoomBehaviorRef.current) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.5, 3])
                     .on("zoom", (event) => {
             const { transform } = event;
             setZoomLevel(transform.k);
             g.attr("transform", `${transform} translate(${centerTranslateRef.current.x}, ${centerTranslateRef.current.y})`);
             // Обновляем всплывающие окна при зуме (закрываем их)
             popupGroup.selectAll("*").remove();
           });

        svg.call(zoom);
        zoomBehaviorRef.current = zoom;
      } else if (isMobile && zoomBehaviorRef.current) {
        // Сбрасываем зум при resize
        svg.call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
        setZoomLevel(1);
      } else if (!isMobile && zoomBehaviorRef.current) {
        // Отключаем зум на десктопе
        svg.on(".zoom", null);
        zoomBehaviorRef.current = null;
        setZoomLevel(1);
      }

             // Обновляем переменные для popup
       centerTranslateRef.current = { x: newCenterTranslateX, y: newCenterTranslateY };
    };

    // Сохраняем переменные для использования в popup
    centerTranslateRef.current = { x: centerTranslateX, y: centerTranslateY };

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
      <MapTitleSection>
        <Logo 
          src="https://e1.edimdoma.ru/assets/layout/header-logo@2x-d6bd55e17937f04c25cbfefb0946708d926575347c284b531900257128c64bd2.png"
          alt="EdimDoma.ru"
        />
        <MapPageTitle>Интерактивная карта рецептов</MapPageTitle>
      </MapTitleSection>
      <MapDescription>
        <p><a href="https://www.edimdoma.ru/" target="_blank" rel="noopener noreferrer">EdimDoma.ru</a> ежемесячно посещают около 10 миллионов пользователей изучая более 90 тысяч рецептов</p>
        
        <p>На основе этих данных мы собрали интерактивную карту самых популярных блюд в регионах России за 2025 год</p>
        
        <p>Теперь вы можете кликнуть на любой регион и узнать, какое блюдо стало настоящим фаворитом у его жителей. В некоторых регионах нужной информации, к сожалению, нет.</p>
        
        <p>Изучайте карту и вдохновляйтесь рецептами со всех уголков России!</p>
      </MapDescription>
      <MapWrapper ref={mapRef} />
      <FullWidthContainer className="sc-hawdNJ fZSglL">
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
            {(searchQuery 
              ? filteredRegions 
              : filteredRegions.filter(region => 
                  ['Москва', 'Санкт-Петербург', 'Краснодарский край'].includes(region.russianName)
                )
            ).map((region) => (
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
      </FullWidthContainer>
      <FullWidthContainer className="sc-hawdNJ fZSglL">
        <TopRecipesContainer>
          <TopRecipesContent>
            <TopRecipesTitle>Топ-10 самых популярных рецептов EdimDoma.ru в 2025 года</TopRecipesTitle>

            <TopRecipesList>
              {topRecipes.map((recipe) => (
                <TopRecipeItem key={recipe.id}>
                  <TopRecipeHeader>
                    <RecipeNumber>{recipe.id}</RecipeNumber>
                    <RecipeContent>
                      <RecipeLink 
                        href={recipe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {recipe.name}
                      </RecipeLink>
                      <RecipeViews>{recipe.views}</RecipeViews>
                    </RecipeContent>
                  </TopRecipeHeader>
                </TopRecipeItem>
              ))}
            </TopRecipesList>
          </TopRecipesContent>
        </TopRecipesContainer>
      </FullWidthContainer>
      <Footer className="footer">
        <FooterContent>
          <FooterTitle>Популярные категории рецептов</FooterTitle>
          <FooterTop>
            <FooterSection>
              <ul>
                <li><a href="https://www.edimdoma.ru/retsepty/tags/161-supy-i-bulony" className="category-title" target="_blank" rel="noopener noreferrer">Супы</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/4033-kurinyy-sup" target="_blank" rel="noopener noreferrer">Куриный суп</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/162-gribnye-supy" target="_blank" rel="noopener noreferrer">Грибной суп</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/4776-syrnyy-sup" target="_blank" rel="noopener noreferrer">Сырный суп</a></li>
              </ul>
            </FooterSection>
            <FooterSection>
              <ul>
                <li><a href="https://www.edimdoma.ru/retsepty/tags/425-salaty" className="category-title" target="_blank" rel="noopener noreferrer">Салаты</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/10606-salaty-iz-myasa" target="_blank" rel="noopener noreferrer">Салаты из мяса</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/281-iz-kuritsy" target="_blank" rel="noopener noreferrer">Салат с курицей</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/10607-salaty-s-govyadinoy" target="_blank" rel="noopener noreferrer">Салаты с говядиной</a></li>
              </ul>
            </FooterSection>
            <FooterSection>
              <ul>
                <li><a href="https://www.edimdoma.ru/retsepty/tags/322-kashi" className="category-title" target="_blank" rel="noopener noreferrer">Каша</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/1508-pshennaya" target="_blank" rel="noopener noreferrer">Пшенная каша</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/8111-mannaya-kasha" target="_blank" rel="noopener noreferrer">Манная каша</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/5661-risovaya-kasha" target="_blank" rel="noopener noreferrer">Рисовая каша</a></li>
              </ul>
            </FooterSection>
            <FooterSection>
              <ul>
                <li><a href="https://www.edimdoma.ru/retsepty/tags/189-deserty" className="category-title" target="_blank" rel="noopener noreferrer">Десерты</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/193-torty" target="_blank" rel="noopener noreferrer">Торты</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/190-konfety" target="_blank" rel="noopener noreferrer">Рецепты конфет</a></li>
                <li className="subcategory"><a href="https://www.edimdoma.ru/retsepty/tags/200-morozhenoe" target="_blank" rel="noopener noreferrer">Мороженое</a></li>
              </ul>
            </FooterSection>
          </FooterTop>
          <FooterBottom>
            <div>© 2003–2025 ООО «<a href="https://www.edimdoma.ru/" target="_blank" rel="noopener noreferrer" style={{color: '#94a3b8', textDecoration: 'none'}}>Едимдома.ру</a>» — рецепты вкусных блюд. Все права защищены</div>
            <SocialLinks>
              <a href="https://vk.com/edimdoma_ru" target="_blank" rel="noopener noreferrer">ВКонтакте</a>
              <a href="https://ok.ru/edimdomaru" target="_blank" rel="noopener noreferrer">Одноклассники</a>
              <a href="https://ru.pinterest.com/edimdoma/" target="_blank" rel="noopener noreferrer">Pinterest</a>
              <a href="https://www.youtube.com/user/VysotskayaJulia" target="_blank" rel="noopener noreferrer">YouTube</a>
              <a href="https://tgrm.github.io/edimdomaru" target="_blank" rel="noopener noreferrer">Telegram</a>
              <a href="https://dzen.ru/edimdoma.ru" target="_blank" rel="noopener noreferrer">Дзен</a>
              <a href="https://rutube.ru/u/juliavysotskaya/videos/" target="_blank" rel="noopener noreferrer">Rutube</a>
            </SocialLinks>
          </FooterBottom>
        </FooterContent>
      </Footer>
    </MapContainer>
  );
}; 