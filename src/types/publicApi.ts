// 공공 API (에어코리아, 기상청 등) 응답 타입 정의

export interface PublicApiResponse<T> {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: T;
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

// 예시: 기상청 단기예보 Item 타입 (실제 문서 참고하여 수정 필요)
export interface WeatherItem {
  baseDate: string;
  baseTime: string;
  category: string;
  obsrValue: string;
  nx: number;
  ny: number;
}

// 예시: 에어코리아 대기질 Item 타입
export interface AirQualityItem {
  dataTime: string;
  pm10Value: string;
  pm25Value: string;
  khaiValue: string;
  khaiGrade: string;
  pm10Grade: string;
  pm25Grade: string;
}

// 예시: 에어코리아 대기질 예보통보 Item 타입
export interface AirForecastItem {
  dataTime: string;
  informCode: string;
  informOverall: string;
  informCause: string;
  informGrade: string;
  actionKnack: string;
}